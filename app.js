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

const validLicenses = ["KICK-VEXA-1234", "KICK-LUMINA-9999", "LOSTSOULMAN-TEST"];

app.post('/api/verify-license', (req, res) => {
    const { licenseKey } = req.body;
    if (validLicenses.includes(licenseKey)) {
        return res.json({ success: true, message: "Lisans doğrulandı!" });
    }
    return res.status(401).json({ success: false, message: "Geçersiz lisans!" });
});

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
        
        if (response.data) {
            const isLive = response.data.livestream !== null || response.data.is_live === true;
            return res.json({ 
                success: true, 
                isLive: isLive, 
                avatar: response.data.user?.profile_pic || '',
                username: response.data.user?.username || channelName
            });
        }
        res.status(404).json({ success: false });
    } catch (error) {
        res.json({ success: false, isLive: false, message: "Simülasyon modu devrede." });
    }
});

app.post('/api/start-viewer', (req, res) => {
    const { channelName, viewerCount } = req.body;

    if (!channelName) return res.status(400).json({ success: false });

    console.log(`\n🚀 [BOT TETİKLENDİ] Kanal: ${channelName} | Adet: ${viewerCount}`);

    // Render üzerinde "python3" komutunu ve dosya yolunu sabitledik
    const pythonProcess = spawn('python3', [path.join(__dirname, 'hapsetmekick.py'), channelName, String(viewerCount || '100')], {
        cwd: __dirname,
        env: { ...process.env }
    });

    pythonProcess.stdout.on('data', (data) => console.log(`[Bot]: ${data.toString().trim()}`));
    pythonProcess.stderr.on('data', (data) => console.error(`[Hata]: ${data.toString().trim()}`));
    pythonProcess.on('close', (code) => console.log(`[Sistem] Bot kapandı. Kod: ${code}`));

    return res.json({ success: true, message: "Bot başlatıldı!" });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda aktif.`);
});
