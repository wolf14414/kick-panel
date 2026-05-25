const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process'); // Python botunu arka planda tetiklemek için gerekli kütüphane

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware'ler
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTML/CSS/JS dosyalarını dışarıya açmak için 'public' klasörünü kullanıyoruz
app.use(express.static(path.join(__dirname, 'public')));

// Örnek Lisans Veritabanı
const validLicenses = ["KICK-VEXA-1234", "KICK-LUMINA-9999", "LOSTSOULMAN-TEST"];

// LİSANS KONTROL API'Sİ
app.post('/api/verify-license', (req, res) => {
    const { licenseKey } = req.body;
    if (validLicenses.includes(licenseKey)) {
        return res.json({ success: true, message: "Lisans doğrulandı!" });
    }
    return res.status(401).json({ success: false, message: "Geçersiz veya süresi dolmuş lisans anahtarı!" });
});

// KICK API DURUM VE GÖRSEL SORGULAMA API'Sİ (Sol Menü & Profil Resmi İçin)
app.get('/api/check-kick/:channel', async (req, res) => {
    try {
        const channelName = req.params.channel.toLowerCase();
        
        // Kick API'sine backend üzerinden güvenli istek atıyoruz
        const response = await axios.get(`https://kick.com/api/v1/channels/${channelName}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 5000 // İstek çok uzarsa paneli kilitlemesin
        });
        
        if (response.data) {
            // Yayın durumu kontrolü (livestream alanı doluysa veya is_live true ise)
            const isLive = response.data.livestream !== null || response.data.is_live === true;
            // Kick kullanıcısının gerçek profil resmi linkini çekiyoruz
            const avatar = response.data.user?.profile_pic || '';

            return res.json({ 
                success: true, 
                isLive: isLive, 
                avatar: avatar,
                username: response.data.user?.username || channelName
            });
        }

        res.status(404).json({ success: false, message: "Kanal verisi alınamadı." });

    } catch (error) {
        console.error(`Kick API Sorgu Hatası (${req.params.channel}):`, error.message);
        // Hata durumunda panelin çökmemesi için varsayılan bir güvenli veri dönüyoruz
        res.json({ 
            success: false, 
            isLive: false, 
            avatar: '', 
            message: "Kick servisine erişilemedi, simülasyon modu devrede." 
        });
    }
});

// GERÇEK İZLEYİCİ BOTU BAŞLATMA API'Sİ (Python Köprüsü)
app.post('/api/start-viewer', (req, res) => {
    const { channelName, viewerCount } = req.body;

    if (!channelName) {
        return res.status(400).json({ success: false, message: 'Kanal adı girilmedi!' });
    }

    console.log(`\n🚀 [BOT TETİKLENDİ] Hedef Kanal: ${channelName} | İstek Adeti: ${viewerCount || 100}`);

    // Arka planda terminal açıp "python hapsetmekick.py kanaladi miktar" komutunu çalıştırır
    const pythonProcess = spawn('python', ['hapsetmekick.py', channelName, String(viewerCount || '100')]);

    // Python aracı komut satırına (CMD) ne yazdırıyorsa aynısını yakalayıp Node.js konsoluna basar
    pythonProcess.stdout.on('data', (data) => {
        console.log(`[Python Bot Log]: ${data.toString().trim()}`);
    });

    // Python botu çalışırken bir hata fırlatırsa buraya düşer
    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python Bot Hatası!]: ${data.toString().trim()}`);
    });

    // Bot süreci tamamen bittiğinde veya kapandığında burası tetiklenir
    pythonProcess.on('close', (code) => {
        console.log(`[Sistem] Python bot süreci sonlandı. Çıkış Kodu: ${code}`);
    });

    // Sitenin donmasını önlemek amacıyla tarayıcıya anında başarılı yanıt döndürüyoruz
    return res.json({ 
        success: true, 
        message: `${channelName} kanalı için ${viewerCount} adet izleyici aracı başarıyla kuyruğa alındı!` 
    });
});

// Ana sayfayı döndür (Bu rota diğer tüm rotaların en altında kalmalı)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🔥 Profesyonel Kick Altyapısı ${PORT} Portunda Aktif.`);
    console.log(`🤖 Arka Plan Python Bot Tetikleme Köprüsü Hazır.`);
    console.log(`=======================================================`);
});
