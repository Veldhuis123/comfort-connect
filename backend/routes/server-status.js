const express = require('express');
const { execSync } = require('child_process');
const os = require('os');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const logger = require('../services/logger');

const router = express.Router();

// Helper to safely run shell commands
const runCommand = (cmd) => {
  try {
    return execSync(cmd, { timeout: 5000, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

// Get server status (admin only)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const uptimeSeconds = os.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptime = `${days}d ${hours}u ${minutes}m`;

    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);
    const loadAvg = os.loadavg();

    let disk = null;
    const dfOutput = runCommand('df -h / --output=size,used,avail,pcent | tail -1');
    if (dfOutput) {
      const parts = dfOutput.trim().split(/\s+/);
      disk = { total: parts[0], used: parts[1], available: parts[2], percent: parseInt(parts[3]) || 0 };
    }

    let fail2ban = null;
    const fail2banServiceStatus = runCommand('systemctl is-active fail2ban 2>/dev/null');
    const fail2banProcess = runCommand("pgrep -f 'fail2ban-server' | head -1");
    const fail2banIsActive = fail2banServiceStatus === 'active' || Boolean(fail2banProcess);

    const f2bSshdCommands = [
      'sudo -n /usr/bin/fail2ban-client status sshd',
      'sudo -n /usr/bin/fail2ban-client -s /run/fail2ban/fail2ban.sock status sshd',
      'sudo -n /usr/bin/fail2ban-client -s /var/run/fail2ban/fail2ban.sock status sshd',
    ];

    const f2bGlobalCommands = [
      'sudo -n /usr/bin/fail2ban-client status',
      'sudo -n /usr/bin/fail2ban-client -s /run/fail2ban/fail2ban.sock status',
      'sudo -n /usr/bin/fail2ban-client -s /var/run/fail2ban/fail2ban.sock status',
    ];

    let f2bOutput = null;
    for (const cmd of f2bSshdCommands) {
      const result = runCommand(cmd);
      if (result) { f2bOutput = result; break; }
    }

    if (!f2bOutput) {
      for (const cmd of f2bGlobalCommands) {
        const result = runCommand(cmd);
        if (result) { f2bOutput = result; break; }
      }
    }

    if (f2bOutput) {
      const currentlyBanned = f2bOutput.match(/Currently banned:\s+(\d+)/);
      const totalBanned = f2bOutput.match(/Total banned:\s+(\d+)/);
      const currentlyFailed = f2bOutput.match(/Currently failed:\s+(\d+)/);
      const totalFailed = f2bOutput.match(/Total failed:\s+(\d+)/);
      const bannedIPs = f2bOutput.match(/Banned IP list:\s*(.*)/);
      fail2ban = {
        currentlyBanned: currentlyBanned ? parseInt(currentlyBanned[1]) : 0,
        totalBanned: totalBanned ? parseInt(totalBanned[1]) : 0,
        currentlyFailed: currentlyFailed ? parseInt(currentlyFailed[1]) : 0,
        totalFailed: totalFailed ? parseInt(totalFailed[1]) : 0,
        bannedIPs: bannedIPs && bannedIPs[1] ? bannedIPs[1].trim().split(/\s+/).filter(Boolean) : [],
      };
    } else if (fail2banIsActive) {
      fail2ban = { currentlyBanned: 0, totalBanned: 0, currentlyFailed: 0, totalFailed: 0, bannedIPs: [] };
    }

    let ufw = null;
    const ufwOutput = runCommand('sudo -n /usr/sbin/ufw status numbered');
    if (ufwOutput) {
      const isActive = ufwOutput.includes('Status: active');
      const rules = [];
      const ruleLines = ufwOutput.split('\n').filter(l => l.match(/^\[\s*\d+\]/));
      ruleLines.forEach(line => { rules.push(line.replace(/^\[\s*\d+\]\s*/, '').trim()); });
      ufw = { active: isActive, rules };
    }

    const services = ['comfort-connect.service', 'comfort-connect.frontend.service', 'mysql'];
    const serviceStatus = services.map(svc => {
      const output = runCommand(`systemctl is-active ${svc} 2>/dev/null`);
      return { name: svc, status: output || 'unknown' };
    });

    res.json({
      uptime, uptimeSeconds,
      cpu: { cores: cpus.length, model: cpus[0]?.model || 'Onbekend', loadAvg: loadAvg.map(l => l.toFixed(2)) },
      memory: { total: formatBytes(totalMem), used: formatBytes(usedMem), free: formatBytes(freeMem), percent: memPercent },
      disk, fail2ban, ufw, services: serviceStatus,
      hostname: os.hostname(), platform: `${os.type()} ${os.release()}`, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('SERVER_STATUS', 'Error fetching status', { error: error.message });
    res.status(500).json({ error: 'Kan serverstatus niet ophalen' });
  }
});

// Unban IP (admin only)
router.post('/unban', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip || !/^[\d.]+$/.test(ip)) {
      return res.status(400).json({ error: 'Ongeldig IP-adres' });
    }

    try {
      execSync(`sudo -n /usr/bin/fail2ban-client set sshd unbanip ${ip}`, {
        timeout: 5000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      });
      logger.audit('IP_UNBANNED', { ip }, req);
      return res.json({ success: true, message: `IP ${ip} is gedeblokkeerd` });
    } catch (cmdError) {
      const detail = String(cmdError?.stderr?.toString?.() || cmdError?.stdout?.toString?.() || cmdError?.message || '').trim();
      const normalized = detail.toLowerCase();
      if (normalized.includes('not banned') || normalized.includes('isn\'t banned')) {
        return res.json({ success: true, message: `IP ${ip} was al gedeblokkeerd` });
      }

      logger.error('SERVER_STATUS', 'Unban command error', { ip, detail });
      return res.status(500).json({
        error: detail ? `Kon IP niet deblokkeren: ${detail}` : 'Kon IP niet deblokkeren',
      });
    }
  } catch (error) {
    logger.error('SERVER_STATUS', 'Unban error', { error: error.message });
    res.status(500).json({ error: 'Kon IP niet deblokkeren' });
  }
});

function formatBytes(bytes) {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

module.exports = router;
