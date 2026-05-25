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

// API: Kick Kanal Bilgisi (403 Korumasını Aşmak İçin Güçlendirildi)
app.get('/api/check-kick/:channel', async (req, res) => {
    try {
        const channelName = req.params.channel.toLowerCase();
        const response = await axios.get(`https://kick.com/api/v1/channels/${channelName}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://kick.com/',
                'Sec-Fetch-Site': 'same-origin'
            },
            timeout: 8000
        });
        
        return res.json({ 
            success: true, 
            isLive: response.data.livestream !== null, 
            avatar: response.data.user?.profile_pic || '',
            username: response.data.user?.username || channelName
        });
    } catch (error) {
        console.error(`Kick API Hatası: ${error.message}`);
        res.json({ success: false, isLive: false, message: "Hata" });
    }
});

// API: Python Bot Tetikleyici
app.post('/api/start-viewer', (req, res) => {
    const { channelName, viewerCount } = req.body;
    if (!channelName) return res.status(400).json({ success: false });

    console.log(`\n🚀 [BOT TETİKLENDİ] Kanal: ${channelName}`);

    // Python tetikleme (python3 yerine doğrudan komutu env ile temizleyerek çağırıyoruz)
    const pythonProcess = spawn('python3', [path.join(__dirname, 'hapsetmekick.py'), channelName, String(viewerCount || '100')], {
        cwd: __dirname,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    pythonProcess.stdout.on('data', (data) => console.log(`[Bot]: ${data.toString().trim()}`));
    pythonProcess.stderr.on('data', (data) => console.error(`[Bot Hatası]: ${data.toString().trim()}`));
    pythonProcess.on('close', (code) => console.log(`[Sistem] Bot Kapandı. Kod: ${code}`));

    return res.json({ success: true, message: "İstek iletildi." });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🔥 Panel Aktif. Port: ${PORT}`));
