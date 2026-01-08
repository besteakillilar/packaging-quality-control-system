// ========================================
// Configuration - Google Apps Script Web App URL
// ========================================
// Bu URL'yi Google Apps Script'i deploy ettikten sonra güncelleyin
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz3WZvLDE3mxHUIodABKcx7AJtI5cHHiFJwrUE7hESmed3YIzZujALJ_BhSTw9yuMXi/exec';

// ========================================
// 📋 DİNAMİK LİSTELER - Google Sheets'ten Yüklenir
// ========================================
// Bu listeler sayfa yüklendiğinde Google Sheets'ten çekilir
let PERSONEL_LISTESI = [];
let MAKINE_LISTESI = [];
let HATA_LISTESI = [];

// ========================================
// DOM Elements
// ========================================
const elements = {
    loadingOverlay: document.getElementById('loadingOverlay'),
    toast: document.getElementById('toast'),
    toastMessage: document.querySelector('.toast-message'),
    navTabs: document.querySelectorAll('.nav-tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    qualityForm: document.getElementById('qualityControlForm'),
    resetFormBtn: document.getElementById('resetForm'),
    fileInput: document.getElementById('hataGorsel'),
    imagePreview: document.getElementById('imagePreview'),
    removeImageBtn: document.getElementById('removeImage'),
    filePlaceholder: document.querySelector('.file-upload-placeholder'),
    filePreviewWrapper: document.querySelector('.file-preview'),
    filterTarih: document.getElementById('filterTarih'),
    filterMakine: document.getElementById('filterMakine'),
    searchBtn: document.getElementById('searchBtn'),
    recordsStats: document.getElementById('recordsStats'),
    totalRecords: document.getElementById('totalRecords'),
    emptyState: document.getElementById('emptyState'),
    recordsTable: document.getElementById('recordsTable'),
    recordsBody: document.getElementById('recordsBody'),
    imageModal: document.getElementById('imageModal'),
    modalImage: document.getElementById('modalImage'),
    closeModal: document.getElementById('closeModal')
};

// ========================================
// Initialize Application
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    initializeDatePickers();
    setupEventListeners();
    setDefaultDate();

    // Listeleri Google Sheets'ten yükle
    await loadListsFromSheets();
});

// ========================================
// Load Lists from Google Sheets
// ========================================
async function loadListsFromSheets() {
    showLoading();

    try {
        const response = await fetchListsFromAPI();

        if (response.success && response.data) {
            // Listeleri güncelle
            PERSONEL_LISTESI = response.data.personnel || [];
            MAKINE_LISTESI = response.data.machines || [];
            HATA_LISTESI = response.data.defects || [];

            console.log('✅ Listeler yüklendi:', {
                personel: PERSONEL_LISTESI.length,
                makine: MAKINE_LISTESI.length,
                hata: HATA_LISTESI.length
            });

            // Dropdown'ları doldur
            populateDropdowns();
        } else {
            console.warn('⚠️ Listeler yüklenemedi');
            showToast('Listeler yüklenemedi. Lütfen sayfayı yenileyin.', 'error');
        }
    } catch (error) {
        console.error('❌ Liste yükleme hatası:', error);
        showToast('Bağlantı hatası. Listeler yüklenemedi.', 'error');
    } finally {
        hideLoading();
    }
}

async function fetchListsFromAPI() {
    return new Promise((resolve, reject) => {
        const callbackName = 'handleListsResponse_' + Date.now();

        window[callbackName] = function (data) {
            delete window[callbackName];
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
            resolve(data);
        };

        const params = new URLSearchParams({
            action: 'getLists',
            callback: callbackName
        });

        const script = document.createElement('script');
        script.src = `${SCRIPT_URL}?${params}`;
        script.onerror = () => {
            delete window[callbackName];
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
            reject(new Error('Script yükleme hatası'));
        };

        document.body.appendChild(script);

        // Timeout - 10 saniye
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
                reject(new Error('Zaman aşımı'));
            }
        }, 10000);
    });
}

// ========================================
// Date Pickers (Flatpickr)
// ========================================
function initializeDatePickers() {
    const flatpickrConfig = {
        locale: 'tr',
        dateFormat: 'd.m.Y',
        allowInput: true,
        theme: 'light'
    };

    flatpickr('#tarih', {
        ...flatpickrConfig,
        defaultDate: new Date()
    });

    flatpickr('#filterTarih', flatpickrConfig);
}

function setDefaultDate() {
    const today = new Date();
    const formattedDate = formatDateTR(today);
    document.getElementById('tarih')._flatpickr.setDate(today);
}

// ========================================
// Dropdowns Population
// ========================================
function populateDropdowns() {
    // 1. Personel Dropdowns
    const personnelDropdowns = ['kefe', 'sayim', 'veriGiris', 'sorumlu', 'kaliteKontrol'];
    personnelDropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            // Keep default option if not multiple
            const defaultOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            // Çoklu seçimde 'Seçiniz' opsiyonuna gerek yok, hatta validasyon sorunu yaratabilir
            if (defaultOption && !select.multiple) select.appendChild(defaultOption);

            PERSONEL_LISTESI.forEach(person => {
                const option = document.createElement('option');
                option.value = person;
                option.textContent = person;
                select.appendChild(option);
            });
        }
    });

    // 2. Makine Dropdowns
    const machineDropdowns = ['makine', 'filterMakine'];
    machineDropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            // Keep default option (Seçiniz... or Tümü)
            const defaultOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (defaultOption) select.appendChild(defaultOption);

            MAKINE_LISTESI.forEach(machine => {
                const option = document.createElement('option');
                option.value = machine;
                option.textContent = machine;
                select.appendChild(option);
            });
        }
    });

    // 3. Hata Dropdowns
    const errorSelect = document.getElementById('hata');
    if (errorSelect) {
        // Keep default option
        const defaultOption = errorSelect.querySelector('option[value=""]');
        errorSelect.innerHTML = '';
        if (defaultOption) errorSelect.appendChild(defaultOption);

        HATA_LISTESI.forEach(error => {
            const option = document.createElement('option');
            option.value = error;
            option.textContent = error;
            errorSelect.appendChild(option);
        });
    }

    // Initialize custom multi-selects
    setupMultiSelectDropdowns();
}

// ========================================
// Custom Multi-Select Logic
// ========================================
function setupMultiSelectDropdowns() {
    const multiSelects = document.querySelectorAll('select[multiple]');

    multiSelects.forEach(select => {
        // Eğer zaten oluşturulmuşsa tekrar oluşturma (re-render durumları için)
        if (select.nextElementSibling && select.nextElementSibling.classList.contains('multi-select-wrapper')) {
            select.nextElementSibling.remove();
        }

        select.classList.add('hidden-select');

        // Wrapper oluştur
        const wrapper = document.createElement('div');
        wrapper.className = 'multi-select-wrapper';

        // Trigger (Görünür Kısım)
        const trigger = document.createElement('div');
        trigger.className = 'multi-select-trigger';
        trigger.tabIndex = 0; // Klavye ile odaklanabilmek için

        // Seçilen değerleri gösteren alan
        const valueSpan = document.createElement('span');
        valueSpan.className = 'multi-select-value placeholder';
        valueSpan.textContent = 'Seçiniz...';
        trigger.appendChild(valueSpan);

        // Seçenekler Listesi
        const optionsList = document.createElement('div');
        optionsList.className = 'multi-select-options';

        // Arama Kutusu
        const searchContainer = document.createElement('div');
        searchContainer.className = 'multi-select-search';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Ara...';

        // Arama kutusuna tıklanınca kapanmayı önle
        searchInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Arama/Filtreleme Mantığı
        searchInput.addEventListener('input', (e) => {
            const filterValue = e.target.value.toLowerCase().trim();
            const items = optionsList.querySelectorAll('.option-item');

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(filterValue)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });

        searchContainer.appendChild(searchInput);
        optionsList.appendChild(searchContainer);

        // Orijinal select'teki seçenekleri kopyala
        Array.from(select.options).forEach(opt => {
            if (opt.value === '') return; // Boş (placeholder) seçeneği atla

            const optionItem = document.createElement('div');
            optionItem.className = 'option-item';
            optionItem.dataset.value = opt.value;

            const checkbox = document.createElement('div');
            checkbox.className = 'option-checkbox';

            const label = document.createElement('span');
            label.textContent = opt.textContent;

            optionItem.appendChild(checkbox);
            optionItem.appendChild(label);

            // Tıklama Olayı
            optionItem.addEventListener('click', (e) => {
                e.stopPropagation(); // Dropdown'ın kapanmasını engelle

                // Görsel seçimi güncelle
                optionItem.classList.toggle('selected');

                // Orijinal select'i güncelle
                opt.selected = optionItem.classList.contains('selected');

                // Trigger metnini güncelle
                updateTriggerText();
            });

            optionsList.appendChild(optionItem);
        });

        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsList);

        // DOM'a ekle (Select'ten hemen sonra)
        select.parentNode.insertBefore(wrapper, select.nextSibling);

        // Fonksiyonel Mantık
        function updateTriggerText() {
            const selectedOptions = Array.from(select.selectedOptions);
            if (selectedOptions.length === 0) {
                valueSpan.textContent = 'Seçiniz...';
                valueSpan.classList.add('placeholder');
            } else {
                valueSpan.textContent = selectedOptions.map(o => o.textContent).join(', ');
                valueSpan.classList.remove('placeholder');
            }
        }

        // Dropdown Açma/Kapama
        trigger.addEventListener('click', (e) => {
            // Dropdown açılıyorsa
            if (!wrapper.classList.contains('open')) {
                // Diğer açık dropdownları kapat
                document.querySelectorAll('.multi-select-wrapper.open').forEach(w => {
                    w.classList.remove('open');
                });

                // Filtreyi temizle ve inputa odaklan
                searchInput.value = '';
                optionsList.querySelectorAll('.option-item').forEach(item => item.classList.remove('hidden'));
                wrapper.classList.add('open');
                setTimeout(() => searchInput.focus(), 50); // Biraz gecikmeli odaklanma
            } else {
                // Kapanıyorsa
                wrapper.classList.remove('open');
            }
        });

        // Dışarı tıklayınca kapat
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
                // Kapandığında filtreyi temizle (opsiyonel, bir dahaki açılışta temiz görünür)
                searchInput.value = '';
                optionsList.querySelectorAll('.option-item').forEach(item => item.classList.remove('hidden'));
            }
        });
    });
}

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
    // Tab Navigation
    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Form Submission
    elements.qualityForm.addEventListener('submit', handleFormSubmit);

    // Reset Form
    elements.resetFormBtn.addEventListener('click', resetForm);

    // File Upload
    elements.fileInput.addEventListener('change', handleFileUpload);
    elements.removeImageBtn.addEventListener('click', removeImage);

    // Search Records
    elements.searchBtn.addEventListener('click', searchRecords);

    // Modal
    elements.closeModal.addEventListener('click', closeImageModal);
    elements.imageModal.addEventListener('click', (e) => {
        if (e.target === elements.imageModal) closeImageModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeImageModal();
    });
}

// ========================================
// Tab Navigation
// ========================================
function switchTab(tabId) {
    elements.navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    elements.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}Tab`);
    });
}

// ========================================
// Form Handling
// ========================================
async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    showLoading();

    try {
        const formData = collectFormData();

        // DEBUG: Form verilerini konsola yazdır
        console.log('=== FORM DATA ===');
        console.log('Tarih:', formData.tarih);
        console.log('Makine:', formData.makine);
        console.log('PO:', formData.po);
        console.log('SKU:', formData.sku);
        console.log('Hata:', formData.hata);
        console.log('Hata Açıklama:', formData.hataAciklama);
        console.log('Kefe:', formData.kefe);
        console.log('Sayım:', formData.sayim);
        console.log('Veri Giriş:', formData.veriGiris);
        console.log('Sorumlu:', formData.sorumlu);
        console.log('Kalite Kontrol:', formData.kaliteKontrol);
        console.log('Görsel var mı:', formData.hataGorsel ? 'Evet' : 'Hayır');
        console.log('Full JSON:', JSON.stringify(formData));
        console.log('=================');

        // Simüle edilmiş API çağrısı (Google Apps Script entegrasyonu)
        if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
            // Demo modu - gerçek API bağlantısı yok
            await simulateApiCall();
            showToast('Kayıt başarıyla eklendi ve e-posta gönderildi!', 'success');
            resetForm();
        } else {
            const response = await submitToGoogleSheets(formData);
            if (response.success) {
                showToast('Kayıt başarıyla eklendi ve e-posta gönderildi!', 'success');
                resetForm();
            } else {
                showToast('Hata: ' + response.message, 'error');
            }
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
        hideLoading();
    }
}

function validateForm() {
    // Hata çıkmadığı durumlar için hata alanını ve personel alanlarını zorunlu tutmuyoruz
    // Sadece kaydın temel kimliği olan alanlar zorunlu kalsın
    const required = ['tarih', 'makine', 'po', 'sku'];
    let isValid = true;

    required.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.style.borderColor = 'var(--error)';
            isValid = false;
        } else {
            field.style.borderColor = '';
        }
    });

    if (!isValid) {
        showToast('Lütfen tüm zorunlu alanları doldurun.', 'error');
    }

    return isValid;
}

function collectFormData() {
    const fileInput = elements.fileInput;
    let imageData = null;

    if (fileInput.files && fileInput.files[0]) {
        imageData = elements.imagePreview.src;
    }

    const getSelectedValues = (id) => {
        const select = document.getElementById(id);
        if (!select) return '';

        if (select.multiple) {
            return Array.from(select.selectedOptions)
                .map(option => option.value)
                .filter(val => val !== '')
                .join(', ');
        }
        return select.value;
    };

    return {
        tarih: document.getElementById('tarih').value,
        makine: document.getElementById('makine').value,
        po: document.getElementById('po').value,
        sku: document.getElementById('sku').value,
        hata: document.getElementById('hata').value,
        hataAciklama: document.getElementById('hataAciklama').value,
        hataGorsel: imageData,
        kefe: getSelectedValues('kefe'),
        sayim: getSelectedValues('sayim'),
        veriGiris: getSelectedValues('veriGiris'),
        sorumlu: getSelectedValues('sorumlu'),
        kaliteKontrol: getSelectedValues('kaliteKontrol')
    };
}

async function submitToGoogleSheets(formData) {
    return new Promise((resolve, reject) => {
        // Google Apps Script için form data olarak gönderiyoruz
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = SCRIPT_URL;
        form.target = 'hidden_iframe';
        form.acceptCharset = 'UTF-8'; // Türkçe karakter desteği

        let formRemoved = false; // Race condition önlemek için flag

        // Her form alanını ayrı hidden input olarak ekle
        const addHiddenInput = (name, value) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value || '';
            form.appendChild(input);
        };

        // Action type
        addHiddenInput('action', 'submit');

        // Form alanları - ayrı ayrı gönder (görsel en sonda olmalı çünkü çok büyük olabilir)
        addHiddenInput('tarih', formData.tarih);
        addHiddenInput('makine', formData.makine);
        addHiddenInput('po', formData.po);
        addHiddenInput('sku', formData.sku);
        addHiddenInput('hata', formData.hata);
        addHiddenInput('hataAciklama', formData.hataAciklama);
        addHiddenInput('kefe', formData.kefe);
        addHiddenInput('sayim', formData.sayim);
        addHiddenInput('veriGiris', formData.veriGiris);
        addHiddenInput('sorumlu', formData.sorumlu);
        addHiddenInput('kaliteKontrol', formData.kaliteKontrol);
        // Görsel en sonda - büyük veri olduğu için diğer alanları etkilememeli
        addHiddenInput('hataGorsel', formData.hataGorsel || '');

        // Hidden iframe for response
        let iframe = document.getElementById('hidden_iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'hidden_iframe';
            iframe.name = 'hidden_iframe';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }

        // Form'u güvenli bir şekilde kaldır
        const removeForm = () => {
            if (!formRemoved && form.parentNode) {
                form.parentNode.removeChild(form);
                formRemoved = true;
            }
        };

        // Timeout for completion
        const timeout = setTimeout(() => {
            removeForm();
            resolve({ success: true, message: 'Kayıt gönderildi' });
        }, 5000); // 5 saniye timeout

        iframe.onload = () => {
            clearTimeout(timeout);
            removeForm();
            resolve({ success: true, message: 'Kayıt başarılı' });
        };

        document.body.appendChild(form);
        form.submit();
    });
}

function resetForm() {
    elements.qualityForm.reset();
    setDefaultDate();
    removeImage();

    // Reset border colors
    elements.qualityForm.querySelectorAll('input, select').forEach(field => {
        field.style.borderColor = '';
    });

    // Reset custom multi-selects
    document.querySelectorAll('.multi-select-wrapper').forEach(wrapper => {
        // Seçimleri kaldır
        wrapper.querySelectorAll('.option-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Trigger metnini sıfırla
        const valueSpan = wrapper.querySelector('.multi-select-value');
        if (valueSpan) {
            valueSpan.textContent = 'Seçiniz...';
            valueSpan.classList.add('placeholder');
        }

        // Arama kutusunu ve filtreleri sıfırla
        const searchInput = wrapper.querySelector('.multi-select-search input');
        if (searchInput) searchInput.value = '';

        wrapper.querySelectorAll('.option-item.hidden').forEach(item => {
            item.classList.remove('hidden');
        });
    });
}

// ========================================
// File Upload Handling
// ========================================
function handleFileUpload(e) {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Lütfen bir görsel dosyası seçin.', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('Dosya boyutu 5MB\'dan küçük olmalıdır.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        elements.imagePreview.src = event.target.result;
        elements.filePlaceholder.classList.add('hidden');
        elements.filePreviewWrapper.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    elements.fileInput.value = '';
    elements.imagePreview.src = '';
    elements.filePlaceholder.classList.remove('hidden');
    elements.filePreviewWrapper.classList.add('hidden');
}

// ========================================
// Records Search
// ========================================
async function searchRecords() {
    const tarih = elements.filterTarih.value;
    const makine = elements.filterMakine.value;

    if (!tarih && !makine) {
        showToast('Lütfen en az bir filtre seçin.', 'error');
        return;
    }

    showLoading();

    try {
        if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
            // Demo modu - örnek veriler
            await simulateApiCall();
            const demoData = generateDemoData(tarih, makine);
            displayRecords(demoData);
        } else {
            const response = await fetchRecords(tarih, makine);
            displayRecords(response.data);
        }
    } catch (error) {
        console.error('Search error:', error);
        showToast('Kayıtlar yüklenirken bir hata oluştu.', 'error');
    } finally {
        hideLoading();
    }
}

async function fetchRecords(tarih, makine) {
    return new Promise((resolve, reject) => {
        // JSONP-like approach using script tag callback
        const callbackName = 'handleSearchResponse_' + Date.now();

        window[callbackName] = function (data) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };

        const params = new URLSearchParams({
            action: 'search',
            tarih: tarih || '',
            makine: makine || '',
            callback: callbackName
        });

        const script = document.createElement('script');
        script.src = `${SCRIPT_URL}?${params}`;
        script.onerror = () => {
            delete window[callbackName];
            document.body.removeChild(script);
            // Fallback: iframe yöntemi
            fetchRecordsViaIframe(tarih, makine).then(resolve).catch(reject);
        };

        document.body.appendChild(script);

        // Timeout
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
                // Fallback
                fetchRecordsViaIframe(tarih, makine).then(resolve).catch(reject);
            }
        }, 5000);
    });
}

// Fallback method using iframe
async function fetchRecordsViaIframe(tarih, makine) {
    return new Promise((resolve) => {
        const params = new URLSearchParams({
            action: 'search',
            tarih: tarih || '',
            makine: makine || ''
        });

        // İframe yöntemi - yanıtı alamayız, bu yüzden doğrudan sheets'e bakmak gerek
        // Şimdilik boş döndür, kullanıcıya bilgi ver
        console.log('Kayıt sorgulama URL:', `${SCRIPT_URL}?${params}`);
        showToast('Kayıt sorgulama için Google Sheets\'i kontrol edin veya yeniden deploy yapın.', 'error');
        resolve({ data: [] });
    });
}

function displayRecords(records) {
    if (!records || records.length === 0) {
        elements.emptyState.classList.remove('hidden');
        elements.recordsTable.classList.add('hidden');
        elements.recordsStats.classList.add('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');
    elements.recordsTable.classList.remove('hidden');
    elements.recordsStats.classList.remove('hidden');
    elements.totalRecords.textContent = records.length;

    elements.recordsBody.innerHTML = records.map(record => `
        <tr>
            <td>${record.tarih}</td>
            <td>${record.makine}</td>
            <td>${record.po}</td>
            <td>${record.sku}</td>
            <td><span class="error-cell">${record.hata}</span></td>
            <td>${record.hataAciklama || '-'}</td>
            <td>
                ${record.hataGorsel ?
            `<a href="#" onclick="openImageModal('${record.hataGorsel}'); return false;" class="view-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Gör
                    </a>`
            : '-'}
            </td>
            <td>${record.kefe}</td>
            <td>${record.sayim}</td>
            <td>${record.veriGiris}</td>
            <td>${record.sorumlu}</td>
            <td>${record.kaliteKontrol}</td>
        </tr>
    `).join('');
}

function generateDemoData(tarih, makine) {
    const hataTurleri = ['Renk Hatası', 'Boyut Hatası', 'Baskı Hatası', 'Malzeme Hatası'];
    const records = [];
    const count = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < count; i++) {
        records.push({
            tarih: tarih || formatDateTR(new Date()),
            makine: makine || `Makine ${Math.floor(Math.random() * 5) + 1}`,
            po: `PO-${Math.floor(Math.random() * 10000)}`,
            sku: `SKU-${Math.floor(Math.random() * 1000)}`,
            hata: hataTurleri[Math.floor(Math.random() * hataTurleri.length)],
            hataAciklama: 'Örnek hata açıklaması',
            kefe: PERSONEL_LISTESI[Math.floor(Math.random() * PERSONEL_LISTESI.length)],
            sayim: PERSONEL_LISTESI[Math.floor(Math.random() * PERSONEL_LISTESI.length)],
            veriGiris: PERSONEL_LISTESI[Math.floor(Math.random() * PERSONEL_LISTESI.length)],
            sorumlu: PERSONEL_LISTESI[Math.floor(Math.random() * PERSONEL_LISTESI.length)],
            kaliteKontrol: PERSONEL_LISTESI[Math.floor(Math.random() * PERSONEL_LISTESI.length)]
        });
    }

    return records;
}

// ========================================
// Modal
// ========================================
function openImageModal(imageSrc) {
    let displayUrl = imageSrc;

    // Google Drive URL ise Thumbnail API kullan (daha güvenilir ve hızlı)
    if (imageSrc && imageSrc.includes('drive.google.com')) {
        let fileId = null;

        // Format 1: /d/FILE_ID/
        const match1 = imageSrc.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match1) fileId = match1[1];

        // Format 2: id=FILE_ID
        if (!fileId) {
            const match2 = imageSrc.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match2) fileId = match2[1];
        }

        if (fileId) {
            // sz=s4000 parametresi ile yüksek çözünürlüklü görsel al
            displayUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=s4000`;
        }
    }

    const modalImg = elements.modalImage;

    // Hata yönetimi
    modalImg.onerror = () => {
        // Sonsuz döngüyü önlemek için error handler'ı temizle
        modalImg.onerror = null;

        if (confirm("Görsel önizlemesi yüklenemedi. Resmi yeni sekmede açmak ister misiniz?")) {
            window.open(imageSrc, '_blank');
            closeImageModal();
        } else {
            // Kırık resim yerine placeholder veya boş gösterilebilir
            modalImg.src = '';
            closeImageModal();
        }
    };

    modalImg.src = displayUrl;
    elements.imageModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    elements.imageModal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ========================================
// Utility Functions
// ========================================
function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showToast(message, type = 'success') {
    elements.toast.classList.remove('hidden', 'success', 'error');
    elements.toast.classList.add(type);
    elements.toastMessage.textContent = message;

    setTimeout(() => elements.toast.classList.add('show'), 10);

    setTimeout(() => {
        elements.toast.classList.remove('show');
        setTimeout(() => elements.toast.classList.add('hidden'), 300);
    }, 4000);
}

function formatDateTR(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

async function simulateApiCall() {
    return new Promise(resolve => setTimeout(resolve, 1000));
}
