const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware'ler
app.use(cors());
app.use(express.json());
// HTML/CSS/JS dosyalarını dışarıya açmak için 'public' klasörünü kullanıyoruz
app.use(express.static(path.join(__dirname, 'public')));

// Örnek Lisans Veritabanı (Geçici olarak JSON mantığı, ileride MongoDB'ye bağlanabilir)
const validLicenses = ["KICK-VEXA-1234", "KICK-LUMINA-9999", "LOSTSOULMAN-TEST"];

// LİSANS KONTROL API'Sİ
app.post('/api/verify-license', (req, res) => {
    const { licenseKey } = req.body;
    if (validLicenses.includes(licenseKey)) {
        return res.json({ success: true, message: "Lisans doğrulandı!" });
    }
    return res.status(401).json({ success: false, message: "Geçersiz veya süresi dolmuş lisans anahtarı!" });
});

// KICK API DURUM SORGULAMA API'Sİ (Güvenli Backend İsteyi)
app.get('/api/check-kick/:channel', async (req, res) => {
    try {
        const channelName = req.params.channel;
        
        // İstekleri doğrudan backend üzerinden Kick API'sine gönderiyoruz (Cloudflare aşımı için daha sağlıklı)
        const response = await axios.get(`https://kick.com/api/v1/channels/${channelName}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const isLive = response.data.livestream !== null;
        res.json({ success: true, isLive: isLive, data: response.data });

    } catch (error) {
        res.status(500).json({ success: false, message: "Kanal bulunamadı veya Kick servisine erişilemedi." });
    }
});

// Ana sayfayı döndür
app.get('*', (path, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Profesyonel Altyapı ${PORT} portunda aktif.`);
});