const express = require('express');
const { execSync } = require('child_process');
const os = require('os');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

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
    // Uptime
    const uptimeSeconds = os.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptime = `${days}d ${hours}u ${minutes}m`;

    // CPU & Memory
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);

    // Load average
    const loadAvg = os.loadavg();

    // Disk usage
    let disk = null;
    const dfOutput = runCommand('df -h / --output=size,used,avail,pcent | tail -1');
    if (dfOutput) {
      const parts = dfOutput.trim().split(/\s+/);
      disk = {
        total: parts[0],
        used: parts[1],
        available: parts[2],
        percent: parseInt(parts[3]) || 0,
      };
    }

    // Fail2ban status
    let fail2ban = null;
    const f2bOutput = runCommand('sudo -n /usr/bin/fail2ban-client status sshd');
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
    }

    // UFW status
    let ufw = null;
    const ufwOutput = runCommand('sudo ufw status numbered 2>/dev/null');
    if (ufwOutput) {
      const isActive = ufwOutput.includes('Status: active');
      const rules = [];
      const ruleLines = ufwOutput.split('\n').filter(l => l.match(/^\[\s*\d+\]/));
      ruleLines.forEach(line => {
        rules.push(line.replace(/^\[\s*\d+\]\s*/, '').trim());
      });
      ufw = { active: isActive, rules };
    }

    // Services status
    const services = ['comfort-connect.service', 'comfort-connect.frontend.service', 'mysql'];
    const serviceStatus = services.map(svc => {
      const output = runCommand(`systemctl is-active ${svc} 2>/dev/null`);
      return { name: svc, status: output || 'unknown' };
    });

    res.json({
      uptime,
      uptimeSeconds,
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'Onbekend',
        loadAvg: loadAvg.map(l => l.toFixed(2)),
      },
      memory: {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem),
        percent: memPercent,
      },
      disk,
      fail2ban,
      ufw,
      services: serviceStatus,
      hostname: os.hostname(),
      platform: `${os.type()} ${os.release()}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Server status error:', error);
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
    const result = runCommand(`sudo fail2ban-client set sshd unbanip ${ip} 2>/dev/null`);
    if (result === null) {
      return res.status(500).json({ error: 'Kon IP niet deblokkeren' });
    }
    res.json({ success: true, message: `IP ${ip} is gedeblokkeerd` });
  } catch (error) {
    console.error('Unban error:', error);
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
