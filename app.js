const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 1. Kick API Kontrolü (Hata yönetimini güçlendirdik)
app.get('/api/check-kick/:channel', async (req, res) => {
    try {
        const channelName = req.params.channel.toLowerCase();
        const response = await axios.get(`https://kick.com/api/v1/channels/${channelName}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Referer': 'https://kick.com/'
            },
            timeout: 5000
        });
        
        return res.json({ 
            success: true, 
            isLive: response.data.livestream !== null, 
            avatar: response.data.user?.profile_pic || '',
            username: response.data.user?.username || channelName
        });
    } catch (error) {
        return res.json({ success: false, isLive: false, message: "Hata" });
    }
});

// 2. Python Bot Tetikleyici (Hata raporlama özelliği eklendi)
app.post('/api/start-viewer', (req, res) => {
    const { channelName, viewerCount } = req.body;
    if (!channelName) return res.status(400).json({ success: false });

    console.log(`\n🚀 [TETİKLENDİ] Kanal: ${channelName}`);

    // python3 komutu Render'da kurulu olan en güncel Python'u tetikler.
    const pythonProcess = spawn('python3', [path.join(__dirname, 'hapsetmekick.py'), channelName, String(viewerCount || '100')], {
        cwd: __dirname,
        env: { ...process.env }
    });

    pythonProcess.stdout.on('data', (data) => console.log(`[Bot Log]: ${data.toString()}`));
    pythonProcess.stderr.on('data', (data) => console.error(`[Bot Hata]: ${data.toString()}`));
    pythonProcess.on('close', (code) => console.log(`[Sistem] Bot sonlandı. Çıkış Kodu: ${code}`));

    return res.json({ success: true, message: "Bot başlatıldı." });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🔥 Panel Hazır! Port: ${PORT}`));
