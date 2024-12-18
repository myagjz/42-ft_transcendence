export async function init() {
    try {
        const response = await fetch('/accounts/get_intra_auth_url', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            console.error('Intra auth URL alınamadı');
        }

        const data = await response.json();
        const intraAuthButton = document.querySelector('a[data-no-router]');

        if (intraAuthButton) {
            intraAuthButton.href = data.intra_auth_url;
        }
    } catch (error) {
        console.error('Intra auth URL alınırken hata oluştu:', error);
    }
}

