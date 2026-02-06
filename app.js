// ========================================
// Configuration - Google Apps Script Web App URL
// ========================================
// Bu URL'yi Google Apps Script'i deploy ettikten sonra gÃ¼ncelleyin
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzldY-t9InQh2SOJZ9CAlAWcL_vDG0au5xi5MRLCBuNd7OrO8hRhhpKLyB0Qr223RZAdA/exec';

// ========================================
// ðŸ“‹ DÄ°NAMÄ°K LÄ°STELER - Google Sheets'ten YÃ¼klenir
// ========================================
// Bu listeler sayfa yüklendiÄŸinde Google Sheets'ten Ã§ekilir
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
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
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

    // Listeleri Google Sheets'ten yÃ¼kle
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
            // Listeleri gÃ¼ncelle
            PERSONEL_LISTESI = response.data.personnel || [];
            MAKINE_LISTESI = response.data.machines || [];
            HATA_LISTESI = response.data.defects || [];

            console.log('âœ… Listeler yüklendi:', {
                personel: PERSONEL_LISTESI.length,
                makine: MAKINE_LISTESI.length,
                hata: HATA_LISTESI.length
            });

            // Dropdown'larÄ± doldur
            populateDropdowns();
        } else {
            console.warn('âš ï¸ Listeler yüklenemedi');
            showToast('Listeler yüklenemedi. Lütfen sayfayÄ± yenileyin.', 'error');
        }
    } catch (error) {
        console.error('âŒ Liste yÃ¼kleme hatasÄ±:', error);
        showToast('BaÄŸlantÄ± hatasÄ±. Listeler yüklenemedi.', 'error');
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
            reject(new Error('Script yÃ¼kleme hatasÄ±'));
        };

        document.body.appendChild(script);

        // Timeout - 10 saniye
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
                reject(new Error('Zaman aÅŸÄ±mÄ±'));
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
        theme: 'light',
        disableMobile: true
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
    // Check currently selected error
    const errorSelect = document.getElementById('hata');
    const selectedError = errorSelect ? errorSelect.value : '';

    // Türkçe karakter desteği için sağlam kontrol
    const normalizedError = selectedError ? selectedError.toLocaleLowerCase('tr').trim() : '';
    const isHeatingError = normalizedError.includes('ısıtma') || normalizedError.includes('isitma');


    // 1. Visibility Toggling
    const kefeSayimRow = document.getElementById('kefeSayimRow');
    const heatingRow = document.getElementById('heatingPersonnelRow');

    if (kefeSayimRow && heatingRow) {
        if (isHeatingError) {
            // kefeSayimRow.classList.add('hidden'); // ARTIK GİZLEMİYORUZ
            kefeSayimRow.classList.remove('hidden'); // Her zaman görünsün
            heatingRow.classList.remove('hidden');   // Isıtma açılsın
        } else {
            kefeSayimRow.classList.remove('hidden');
            heatingRow.classList.add('hidden');      // Isıtma gizlensin
        }
    }

    // 2. Personel Dropdowns (Standard + Special)
    // 'isitmaPersonel' de artık bu listeye dahil edilmeli
    const personnelDropdowns = ['kefe', 'sayim', 'veriGiris', 'sorumlu', 'kaliteKontrol', 'isitmaPersonel'];

    personnelDropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            // Save selected values to restore them if possible
            let selectedValues = Array.from(select.selectedOptions).map(opt => opt.value);

            // Keep default option if not multiple
            const defaultOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            // Çoklu seçimde 'Seçiniz' opsiyonuna gerek yok, hatta validasyon sorunu yaratabilir
            if (defaultOption && !select.multiple) select.appendChild(defaultOption);

            PERSONEL_LISTESI.forEach(person => {
                const option = document.createElement('option');
                option.value = person;
                option.textContent = person;

                // Mevcut seçimleri koru
                if (selectedValues.includes(person)) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    });


    // 2. Makine Dropdowns
    const machineDropdowns = ['makine', 'filterMakine'];
    machineDropdowns.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            // Check if this is a rebuild (don't lose selection)
            const selectedVal = select.value;

            // Keep default option (Seçiniz... or Tümü)
            const defaultOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (defaultOption) select.appendChild(defaultOption);

            MAKINE_LISTESI.forEach(machine => {
                const option = document.createElement('option');
                option.value = machine;
                option.textContent = machine;
                if (machine === selectedVal) option.selected = true;
                select.appendChild(option);
            });
        }
    });

    // 3. Hata Dropdowns (Only populate if empty or initial load, to avoid loop)
    if (errorSelect && errorSelect.options.length <= 1) {
        const defaultOption = errorSelect.querySelector('option[value=""]');
        errorSelect.innerHTML = '';
        if (defaultOption) errorSelect.appendChild(defaultOption);

        HATA_LISTESI.forEach(error => {
            const option = document.createElement('option');
            option.value = error;
            option.textContent = error;
            if (error === selectedError) option.selected = true;
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
        // EÄŸer zaten oluşturulmuÅŸsa tekrar oluşturma (re-render durumlarÄ± iÃ§in)
        if (select.nextElementSibling && select.nextElementSibling.classList.contains('multi-select-wrapper')) {
            select.nextElementSibling.remove();
        }

        select.classList.add('hidden-select');

        // Wrapper oluştur
        const wrapper = document.createElement('div');
        wrapper.className = 'multi-select-wrapper';

        // Trigger (GÃ¶rÃ¼nÃ¼r KÄ±sÄ±m)
        const trigger = document.createElement('div');
        trigger.className = 'multi-select-trigger';
        trigger.tabIndex = 0; // Klavye ile odaklanabilmek iÃ§in

        // SeÃ§ilen deÄŸerleri gÃ¶steren alan
        const valueSpan = document.createElement('span');
        valueSpan.className = 'multi-select-value placeholder';
        valueSpan.textContent = 'Seçiniz...';
        trigger.appendChild(valueSpan);

        // SeÃ§enekler Listesi
        const optionsList = document.createElement('div');
        optionsList.className = 'multi-select-options';

        // Arama Kutusu
        const searchContainer = document.createElement('div');
        searchContainer.className = 'multi-select-search';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Ara...';

        // Arama kutusuna tÄ±klanÄ±nca kapanmayÄ± Ã¶nle
        searchInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Arama/Filtreleme MantÄ±ÄŸÄ±
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

        // Orijinal select'teki seÃ§enekleri kopyala
        Array.from(select.options).forEach(opt => {
            if (opt.value === '') return; // BoÅŸ (placeholder) seÃ§eneÄŸi atla

            const optionItem = document.createElement('div');
            optionItem.className = 'option-item';
            optionItem.dataset.value = opt.value;

            const checkbox = document.createElement('div');
            checkbox.className = 'option-checkbox';

            const label = document.createElement('span');
            label.textContent = opt.textContent;

            optionItem.appendChild(checkbox);
            optionItem.appendChild(label);

            // Başlangıç durumu kontrolü (Otomatik seçimler için kritik)
            if (opt.selected) {
                optionItem.classList.add('selected');
            }

            // TÄ±klama OlayÄ±
            optionItem.addEventListener('click', (e) => {
                e.stopPropagation(); // Dropdown'Ä±n kapanmasÄ±nÄ± engelle

                // GÃ¶rsel seÃ§imi gÃ¼ncelle
                optionItem.classList.toggle('selected');

                // Orijinal select'i gÃ¼ncelle
                opt.selected = optionItem.classList.contains('selected');

                // Trigger metnini gÃ¼ncelle
                updateTriggerText();
            });

            optionsList.appendChild(optionItem);
        });

        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsList);

        // DOM'a ekle (Select'ten hemen sonra)
        select.parentNode.insertBefore(wrapper, select.nextSibling);

        // Fonksiyonel MantÄ±k
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

        // Başlangıç metnini güncelle (Auto-select'i yansıtmak için önemli)
        updateTriggerText();

        // Dropdown AÃ§ma/Kapama
        trigger.addEventListener('click', (e) => {
            // Dropdown aÃ§Ä±lÄ±yorsa
            if (!wrapper.classList.contains('open')) {
                // DiÄŸer aÃ§Ä±k dropdownlarÄ± kapat
                document.querySelectorAll('.multi-select-wrapper.open').forEach(w => {
                    w.classList.remove('open');
                });

                // Filtreyi temizle ve inputa odaklan
                searchInput.value = '';
                optionsList.querySelectorAll('.option-item').forEach(item => item.classList.remove('hidden'));
                wrapper.classList.add('open');
                setTimeout(() => searchInput.focus(), 50); // Biraz gecikmeli odaklanma
            } else {
                // KapanÄ±yorsa
                wrapper.classList.remove('open');
            }
        });

        // DÄ±ÅŸarÄ± tÄ±klayÄ±nca kapat
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
                // KapandÄ±ÄŸÄ±nda filtreyi temizle (opsiyonel, bir dahaki aÃ§Ä±lÄ±ÅŸta temiz gÃ¶rÃ¼nÃ¼r)
                searchInput.value = '';
                optionsList.querySelectorAll('.option-item').forEach(item => item.classList.remove('hidden'));
            }
        });
    });
}

// ========================================
// Event Listeners
// ========================================
// Pagination State
let currentPage = 1;
let rowsPerPage = 15;
let currentRecords = [];

// ========================================
// Event Listeners (Updated)
// ========================================
// ========================================
// Event Listeners (Updated)
// ========================================
// setupEventListeners was here


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

    // Show confirmation modal instead of submitting directly
    showConfirmModal();
}

// Confirmation Modal Functions
function showConfirmModal() {
    const modal = document.getElementById('confirmSubmitModal');
    if (modal) modal.classList.remove('hidden');
}

function hideConfirmModal() {
    const modal = document.getElementById('confirmSubmitModal');
    if (modal) modal.classList.add('hidden');
}

async function confirmAndSubmit() {
    hideConfirmModal();
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
        showToast('Lütfen tÃ¼m zorunlu alanları doldurun.', 'error');
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
        kaliteKontrol: getSelectedValues('kaliteKontrol'),
        isitma: getSelectedValues('isitmaPersonel') // Yeni alan: Isıtma Personeli
    };
}

async function submitToGoogleSheets(formData) {
    return new Promise((resolve, reject) => {
        // Google Apps Script iÃ§in form data olarak gÃ¶nderiyoruz
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = SCRIPT_URL;
        form.target = 'hidden_iframe';
        form.acceptCharset = 'UTF-8'; // TÃ¼rkÃ§e karakter desteÄŸi

        let formRemoved = false; // Race condition Ã¶nlemek iÃ§in flag

        // Her form alanÄ±nÄ± ayrÄ± hidden input olarak ekle
        const addHiddenInput = (name, value) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value || '';
            form.appendChild(input);
        };

        // Action type
        addHiddenInput('action', 'submit');

        // Form alanları - ayrÄ± ayrÄ± gÃ¶nder (görsel en sonda olmalÄ± Ã§Ã¼nkÃ¼ Ã§ok bÃ¼yÃ¼k olabilir)
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
        addHiddenInput('isitma', formData.isitma); // Yeni alan
        // GÃ¶rsel en sonda - bÃ¼yÃ¼k veri olduÄŸu iÃ§in diÄŸer alanları etkilememeli
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

        // Form'u gÃ¼venli bir ÅŸekilde kaldır
        const removeForm = () => {
            if (!formRemoved && form.parentNode) {
                form.parentNode.removeChild(form);
                formRemoved = true;
            }
        };

        // Timeout for completion
        const timeout = setTimeout(() => {
            removeForm();
            resolve({ success: true, message: 'KayÄ±t gönderildi' });
        }, 5000); // 5 saniye timeout

        iframe.onload = () => {
            clearTimeout(timeout);
            removeForm();
            resolve({ success: true, message: 'KayÄ±t baÅŸarÄ±lÄ±' });
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
        // SeÃ§imleri kaldır
        wrapper.querySelectorAll('.option-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Trigger metnini sÄ±fÄ±rla
        const valueSpan = wrapper.querySelector('.multi-select-value');
        if (valueSpan) {
            valueSpan.textContent = 'Seçiniz...';
            valueSpan.classList.add('placeholder');
        }

        // Arama kutusunu ve filtreleri sÄ±fÄ±rla
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
        showToast('Lütfen bir görsel dosyasÄ± seçin.', 'error');
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
// Records Search & Pagination
// ========================================
async function searchRecords(isAutoLoad = false) {
    const tarih = elements.filterTarih.value;
    const makine = elements.filterMakine.value;

    showLoading();

    try {
        let records = [];
        if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
            await simulateApiCall();
            records = generateDemoData(tarih, makine);
        } else {
            // Fetch records from backend
            const response = await fetchRecords(tarih, makine);
            records = response.data || [];
        }

        // Client-side sorting: En son girilen en Ã¼stte (Array'i ters Ã§evir)
        currentRecords = records.reverse();

        // Filtreleme sonuÃ§larÄ±nÄ± gÃ¶ster
        currentPage = 1;
        renderPagination();

        // Ä°statistik gÃ¼ncelle
        elements.totalRecords.textContent = currentRecords.length;

        if (currentRecords.length === 0) {
            elements.emptyState.classList.remove('hidden');
            elements.recordsTable.classList.add('hidden');
            elements.recordsStats.classList.add('hidden');
            const paginationControls = document.getElementById('paginationControls');
            if (paginationControls) paginationControls.classList.add('hidden');
        } else {
            elements.emptyState.classList.add('hidden');
            elements.recordsTable.classList.remove('hidden');
            elements.recordsStats.classList.remove('hidden');
            const paginationControls = document.getElementById('paginationControls');
            if (paginationControls) paginationControls.classList.remove('hidden');
        }

    } catch (error) {
        console.error('Search error:', error);
        showToast('KayÄ±tlar yÃ¼klenirken bir hata oluştu.', 'error');
    } finally {
        hideLoading();
    }
}

function changePage(direction) {
    const totalPages = Math.ceil(currentRecords.length / rowsPerPage) || 1;
    const newPage = currentPage + direction;

    // Bounds check to prevent errors
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderPagination();
    }
}

function renderPagination() {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = currentRecords.slice(start, end);

    displayRecords(pageData);

    // Update UI Controls
    const totalPages = Math.ceil(currentRecords.length / rowsPerPage) || 1;
    const pageInfo = document.getElementById('pageInfo');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');

    if (pageInfo) pageInfo.textContent = `Sayfa ${currentPage} / ${totalPages}`;
    if (prevPage) prevPage.disabled = currentPage === 1;
    if (nextPage) nextPage.disabled = currentPage === totalPages;
}

async function fetchRecords(tarih, makine) {
    return new Promise((resolve, reject) => {
        // JSONP-like approach using script tag callback
        const callbackName = 'handleSearchResponse_' + Date.now();

        // 1. Callback fonksiyonunu global scope'a tanÄ±mla
        window[callbackName] = function (data) {
            console.log('âœ… Veri alÄ±ndÄ±:', data);
            cleanup();
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
        script.id = 'script_' + callbackName;

        // Temizlik fonksiyonu
        function cleanup() {
            if (window[callbackName]) {
                window[callbackName] = null;
                try {
                    delete window[callbackName];
                } catch (e) { }
            }
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        }

        script.onerror = () => {
            console.error('âŒ Script yÃ¼kleme hatasÄ± (Network Error)');
            cleanup();
            // Fallback: iframe yÃ¶ntemi
            fetchRecordsViaIframe(tarih, makine).then(resolve).catch(reject);
        };

        document.body.appendChild(script);

        // Timeout - 30 saniye
        setTimeout(() => {
            if (window[callbackName]) {
                console.warn('âš ï¸ Zaman aÅŸÄ±mÄ± (30sn):', callbackName);
                cleanup();
                // Fallback
                fetchRecordsViaIframe(tarih, makine).then(resolve).catch(reject);
            }
        }, 30000);
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

        // Ä°frame yÃ¶ntemi - yanÄ±tÄ± alamayÄ±z, bu yÃ¼zden doÄŸrudan sheets'e bakmak gerek
        // Åžimdilik boÅŸ dÃ¶ndÃ¼r, kullanÄ±cÄ±ya bilgi ver
        console.log('KayÄ±t sorgulama URL:', `${SCRIPT_URL}?${params}`);
        showToast('KayÄ±t sorgulama iÃ§in Google Sheets\'i kontrol edin veya yeniden deploy yapÄ±n.', 'error');
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
        <tr draggable="false">
            <td data-label="Tarih" draggable="false">${record.tarih}</td>
            <td data-label="Makine" draggable="false">${record.makine}</td>
            <td data-label="PO" draggable="false">${record.po}</td>
            <td data-label="SKU" draggable="false">${record.sku}</td>
            <td data-label="Hata" draggable="false"><span class="error-cell" draggable="false">${record.hata}</span></td>
            <td data-label="Açıklama" draggable="false">${record.hataAciklama || '-'}</td>
            <td data-label="Görsel" draggable="false">
                ${record.hataGorsel ?
            `<a href="#" onclick="openImageModal('${record.hataGorsel}'); return false;" class="view-link" draggable="false">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" draggable="false">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Gör
                    </a>`
            : '-'}
            </td>
            <td data-label="Kefe" draggable="false">${record.kefe || '-'}</td>
            <td data-label="Sayım" draggable="false">${record.sayim || '-'}</td>
            <td data-label="Veri Giriş" draggable="false">${record.veriGiris || '-'}</td>
            <td data-label="Sorumlu" draggable="false">${record.sorumlu || '-'}</td>
            <td data-label="Kalite" draggable="false">${record.kaliteKontrol || '-'}</td>
        </tr>
    `).join('');
}

function generateDemoData(tarih, makine) {
    const hataTurleri = ['Renk HatasÄ±', 'Boyut HatasÄ±', 'BaskÄ± HatasÄ±', 'Malzeme HatasÄ±'];
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

    // Google Drive URL ise Thumbnail API kullan (daha gÃ¼venilir ve hÄ±zlÄ±)
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
            // sz=s4000 parametresi ile yÃ¼ksek Ã§Ã¶zÃ¼nÃ¼rlÃ¼klÃ¼ görsel al
            displayUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=s4000`;
        }
    }

    const modalImg = elements.modalImage;

    // Hata yÃ¶netimi
    modalImg.onerror = () => {
        // Sonsuz dÃ¶ngÃ¼yÃ¼ Ã¶nlemek iÃ§in error handler'Ä± temizle
        modalImg.onerror = null;

        if (confirm("GÃ¶rsel Ã¶nizlemesi yüklenemedi. Resmi yeni sekmede aÃ§mak ister misiniz?")) {
            window.open(imageSrc, '_blank');
            closeImageModal();
        } else {
            // KÄ±rÄ±k resim yerine placeholder veya boÅŸ gÃ¶sterilebilir
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

// ========================================
// Event Listeners (Moved to End)
// ========================================
function setupEventListeners() {
    // Tab Navigation
    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
            // Tab degistiginde kayitlar sekmesi ise otomatik yükle
            if (tab.dataset.tab === 'records') {
                // Sadece ilk seferde veya filtreler bossa otomatik yükle
                if (currentRecords.length === 0) {
                    searchRecords(true);
                }
            }
        });
    });

    // Form Submission
    elements.qualityForm.addEventListener('submit', handleFormSubmit);

    // Reset Form
    elements.resetFormBtn.addEventListener('click', resetForm);

    // File Upload
    elements.fileInput.addEventListener('change', handleFileUpload);
    elements.removeImageBtn.addEventListener('click', removeImage);

    // Search Records
    elements.searchBtn.addEventListener('click', () => searchRecords(false));

    // Clear Filters
    if (elements.clearFiltersBtn) {
        elements.clearFiltersBtn.addEventListener('click', () => {
            // Reset Date (Flatpickr)
            if (elements.filterTarih._flatpickr) {
                elements.filterTarih._flatpickr.clear();
            } else {
                elements.filterTarih.value = '';
            }

            // Reset Machine
            if (elements.filterMakine) {
                elements.filterMakine.value = '';
            }

            // Trigger Search to show all records
            searchRecords(false);
        });
    }

    // Hata değiştiğinde personel listesini güncelle (Isıtma kontrolü)
    const errorSelect = document.getElementById('hata');
    if (errorSelect) {
        errorSelect.addEventListener('change', () => {
            populateDropdowns();
        });
    }

    // Pagination Controls
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const rowsPerPageSelect = document.getElementById('rowsPerPage');

    if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(-1));
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(1));
    if (rowsPerPageSelect) {
        rowsPerPageSelect.addEventListener('change', (e) => {
            rowsPerPage = parseInt(e.target.value);
            currentPage = 1;
            renderPagination();
        });
    }

    // Modal
    elements.closeModal.addEventListener('click', closeImageModal);
    elements.imageModal.addEventListener('click', (e) => {
        if (e.target === elements.imageModal) closeImageModal();
    });

    // Confirm Submit Modal
    const confirmCancelBtn = document.getElementById('confirmCancel');
    const confirmSubmitBtn = document.getElementById('confirmSubmit');
    const confirmModal = document.getElementById('confirmSubmitModal');

    if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', hideConfirmModal);
    if (confirmSubmitBtn) confirmSubmitBtn.addEventListener('click', confirmAndSubmit);
    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) hideConfirmModal();
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeImageModal();
            hideConfirmModal();
        }
    });

    // Prevent dragstart on table to stop ghost dragging
    document.addEventListener('dragstart', (e) => {
        if (e.target.closest('.records-table')) {
            e.preventDefault();
        }
    });
}

