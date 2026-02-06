// ========================================
// MODERN FETCH API FUNCTIONS - JSONP Yerine
// ========================================

async function fetchListsFromAPI() {
    try {
        const formData = new FormData();
        formData.append('action', 'getLists');

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

async function fetchRecords(tarih, makine) {
    try {
        const formData = new FormData();
        formData.append('action', 'search');
        formData.append('tarih', tarih || '');
        formData.append('makine', makine || '');

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Kayıtlar alındı:', data);
        return data;
    } catch (error) {
        console.error('❌ Kayıt sorgulama hatası:', error);
        showToast('Kayıt sorgulama hatası. Lütfen tekrar deneyin.', 'error');
        return { data: [] };
    }
}
