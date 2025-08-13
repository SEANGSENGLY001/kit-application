// ============================
// SECURITY WARNING
// ============================
// This is a demo application only. Passwords are stored using simple SHA-256 
// hashing which is NOT SECURE for production use. In a real application, use 
// proper password hashing (bcrypt, scrypt, Argon2) with salt and never store 
// passwords client-side. All data is stored locally in the browser and is not 
// persistent across different devices or browsers.

class KitCalculatorApp {
    constructor() {
        // Application state
        this.currentUser = null;
        this.usersData = null;
        this.xmlDocument = null;
        this.isAuthenticated = false;
        
        // Cellcard prefixes for Cambodia
        this.cellcardPrefixes = ['011', '012', '014', '017', '061', '076', '077', '078', '079', '085'];
        
        // Generated phone numbers for duplicate checking
        this.generatedNumbers = new Set();
        
        // Pagination and filtering state
        this.kitPagination = {
            currentPage: 1,
            entriesPerPage: 10,
            searchTerm: '',
            filterColumn: '',
            filterValue: '',
            filteredData: []
        };
        
        this.phonePagination = {
            currentPage: 1,
            entriesPerPage: 10,
            searchTerm: '',
            filterColumn: '',
            filterValue: '',
            filteredData: []
        };
        
        // Initialize the application
        this.init();
    }

    async init() {
        this.showLoading(true);
        
        try {
            // Load XML data
            await this.loadXMLData();
            
            // Setup event listeners
            this.setupEventListeners();

            // Force dark theme only
            document.documentElement.classList.add('dark');
            
            // Check if user is already logged in
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                this.currentUser = savedUser;
                this.isAuthenticated = true;
                this.showMainApp();
                this.updateDashboard();
            } else {
                this.showAuthSection();
            }
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showToast('Failed to load application data', 'error');
            this.showAuthSection();
        } finally {
            this.showLoading(false);
        }
    }

    async loadXMLData() {
        try {
            // Try to fetch the XML file
            const response = await fetch('data/users.xml');
            const xmlText = await response.text();
            
            // Parse XML
            const parser = new DOMParser();
            this.xmlDocument = parser.parseFromString(xmlText, 'text/xml');
            
            // Check for parsing errors
            const parseError = this.xmlDocument.querySelector('parsererror');
            if (parseError) {
                throw new Error('XML parsing error');
            }
            
            // Convert XML to JavaScript object and merge with localStorage
            this.usersData = this.parseXMLToObject();
            this.mergeWithLocalStorage();
            
        } catch (error) {
            console.warn('Could not load XML file, using fallback data:', error);
            this.createFallbackData();
        }
    }

    parseXMLToObject() {
        const users = {};
        const userElements = this.xmlDocument.querySelectorAll('user');
        
        userElements.forEach(userEl => {
            const username = userEl.getAttribute('username');
            const passwordHash = userEl.getAttribute('passwordHash');
            
            const kitCalcs = [];
            const phoneGens = [];
            
            // Parse kit calculations
            const kitElements = userEl.querySelectorAll('kitCalculations calculation');
            kitElements.forEach(calc => {
                kitCalcs.push({
                    kitNumber: calc.getAttribute('kitNumber'),
                    rawResult: calc.getAttribute('rawResult'),
                    paddedResult: calc.getAttribute('paddedResult'),
                    timestamp: calc.getAttribute('timestamp')
                });
            });
            
            // Parse phone generations
            const phoneElements = userEl.querySelectorAll('phoneGenerations generation');
            phoneElements.forEach(gen => {
                phoneGens.push({
                    number: gen.getAttribute('number'),
                    prefix: gen.getAttribute('prefix'),
                    timestamp: gen.getAttribute('timestamp')
                });
            });
            
            users[username] = {
                passwordHash,
                history: {
                    kitCalculations: kitCalcs,
                    phoneGenerations: phoneGens
                }
            };
        });
        
        return users;
    }

    mergeWithLocalStorage() {
        const localData = localStorage.getItem('usersData');
        if (localData) {
            const parsedLocalData = JSON.parse(localData);
            
            // Merge local storage data with XML data
            Object.keys(parsedLocalData).forEach(username => {
                if (this.usersData[username]) {
                    // Merge histories
                    this.usersData[username].history.kitCalculations = [
                        ...this.usersData[username].history.kitCalculations,
                        ...parsedLocalData[username].history.kitCalculations
                    ];
                    this.usersData[username].history.phoneGenerations = [
                        ...this.usersData[username].history.phoneGenerations,
                        ...parsedLocalData[username].history.phoneGenerations
                    ];
                } else {
                    // Add new user from localStorage
                    this.usersData[username] = parsedLocalData[username];
                }
            });
        }
    }

    createFallbackData() {
        // Initialize empty users data if XML loading fails
        this.usersData = {};
        
        // Create empty XML document structure
        this.xmlDocument = document.implementation.createDocument(null, "users", null);
        
        this.mergeWithLocalStorage();
    }

    setupEventListeners() {
        // Auth form listeners
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('show-register').addEventListener('click', (e) => this.showRegisterForm(e));
        document.getElementById('show-login').addEventListener('click', (e) => this.showLoginForm(e));
        
        // Forgot password (demo functionality)
        const forgotPasswordLink = document.querySelector('.forgot-password');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showToast('Demo mode: Password reset not available. Use demo credentials.', 'warning');
            });
        }
        
        // Navigation listeners
        document.querySelectorAll('.nav-link').forEach(link => {
            if (!link.id) { // Skip logout button
                link.addEventListener('click', (e) => this.handleNavigation(e));
            }
        });
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
        
        // Sidebar toggle
        document.getElementById('sidebar-toggle').addEventListener('click', () => this.toggleSidebar());
        
        // Kit calculator listeners
        document.getElementById('kit-calculator-form').addEventListener('submit', (e) => this.handleKitCalculation(e));
        
        // Phone generator listeners
        document.getElementById('generate-phone-btn').addEventListener('click', () => this.generatePhoneNumber());
        
        // Account page listeners
        document.getElementById('export-data-btn').addEventListener('click', async () => await this.exportUserData());
        document.getElementById('clear-history-btn').addEventListener('click', () => this.clearHistory());
        document.getElementById('reset-demo-btn').addEventListener('click', () => this.resetDemo());
        
        // Kit calculator filtering and pagination
        document.getElementById('kit-search').addEventListener('input', (e) => this.filterKitHistory());
        document.getElementById('kit-search-clear').addEventListener('click', () => this.clearKitSearch());
        document.getElementById('kit-filter-column').addEventListener('change', (e) => this.handleKitFilterColumn(e));
        document.getElementById('kit-filter-value').addEventListener('input', (e) => this.filterKitHistory());
        document.getElementById('kit-clear-history').addEventListener('click', () => this.clearKitHistory());
        document.getElementById('kit-entries-per-page').addEventListener('change', (e) => this.handleKitEntriesPerPageChange(e));
        
        // Phone generator filtering and pagination
        document.getElementById('phone-search').addEventListener('input', (e) => this.filterPhoneHistory());
        document.getElementById('phone-search-clear').addEventListener('click', () => this.clearPhoneSearch());
        document.getElementById('phone-filter-column').addEventListener('change', (e) => this.handlePhoneFilterColumn(e));
        document.getElementById('phone-filter-value').addEventListener('input', (e) => this.filterPhoneHistory());
        document.getElementById('phone-clear-history').addEventListener('click', () => this.clearPhoneHistory());
        document.getElementById('phone-entries-per-page').addEventListener('change', (e) => this.handlePhoneEntriesPerPageChange(e));
        
        // Mobile responsive listeners
        window.addEventListener('resize', () => this.handleResize());

    }

    async hashPassword(password) {
        // Simple SHA-256 hashing - NOT SECURE for production!
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const passwordHash = await this.hashPassword(password);
            
            if (this.usersData[username] && this.usersData[username].passwordHash === passwordHash) {
                this.currentUser = username;
                this.isAuthenticated = true;
                localStorage.setItem('currentUser', username);
                
                this.showMainApp();
                this.showToast(`Welcome back, ${username}!`, 'success');
                this.updateDashboard();
            } else {
                this.showToast('Invalid username or password', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('An error occurred during login', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        if (!username || !password || !confirmPassword) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 4) {
            this.showToast('Password must be at least 4 characters', 'error');
            return;
        }
        
        if (this.usersData[username]) {
            this.showToast('Username already exists', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const passwordHash = await this.hashPassword(password);
            
            // Add new user
            this.usersData[username] = {
                passwordHash,
                history: {
                    kitCalculations: [],
                    phoneGenerations: []
                }
            };
            
            // Save to localStorage only (no automatic XML export)
            this.saveToLocalStorage();
            
            this.currentUser = username;
            this.isAuthenticated = true;
            localStorage.setItem('currentUser', username);
            
            this.showMainApp();
            this.showToast(`Welcome, ${username}! Account created successfully.`, 'success');
            this.updateDashboard();
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('An error occurred during registration', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    handleLogout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('currentUser');
        
        // Clear sensitive data
        this.generatedNumbers.clear();
        
        this.showAuthSection();
        this.showToast('Logged out successfully', 'success');
    }

    handleNavigation(e) {
        e.preventDefault();
        
        const page = e.target.getAttribute('data-page');
        this.showPage(page);
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        e.target.classList.add('active');
        
        // Update page content if needed
        if (page === 'dashboard') {
            this.updateDashboard();
        } else if (page === 'kit-calculator') {
            this.updateKitHistory();
        } else if (page === 'phone-generator') {
            this.updatePhoneHistory();
        } else if (page === 'account') {
            this.updateAccountInfo();
        }
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        
        // Show selected page
        const page = document.getElementById(`${pageId}-page`);
        if (page) {
            page.classList.add('active');
        }
    }

    handleKitCalculation(e) {
        e.preventDefault();
        
        const kitNumberInput = document.getElementById('kit-number');
        const kitNumber = parseInt(kitNumberInput.value);
        
        if (isNaN(kitNumber) || kitNumber < 0 || kitNumber >= 10000000000) {
            this.showToast('Please enter a valid kit number (0-9,999,999,999)', 'error');
            return;
        }
        
        // Calculate result
        const rawResult = 10000000000 - kitNumber;
        
        // Check if result exceeds 8 digits
        if (rawResult >= 100000000) {
            this.showToast('Result exceeds 8 digits limit', 'error');
            return;
        }
        
        // Pad to 8 digits
        const paddedResult = rawResult.toString().padStart(8, '0');
        
        // Create calculation record
        const calculation = {
            kitNumber: kitNumber.toString(),
            rawResult: rawResult.toString(),
            paddedResult,
            timestamp: this.getCurrentTimestamp()
        };
        
        // Add to user history
        this.usersData[this.currentUser].history.kitCalculations.push(calculation);
        this.saveToLocalStorage();
        
        // Display result
        this.displayKitResult(calculation);
        
        // Update history table
        this.updateKitHistory();
        
        // Clear form
        kitNumberInput.value = '';
        
        this.showToast('Calculation completed!', 'success');
    }

    displayKitResult(calculation) {
        const resultDiv = document.getElementById('calculation-result');
        const rawResultSpan = document.getElementById('raw-result');
        const paddedResultSpan = document.getElementById('padded-result');
        
        rawResultSpan.textContent = parseInt(calculation.rawResult).toLocaleString();
        paddedResultSpan.textContent = calculation.paddedResult;
        
        resultDiv.style.display = 'block';
    }

    generatePhoneNumber() {
        const allowDuplicates = document.getElementById('allow-duplicates').checked;
        
        let phoneNumber;
        let attempts = 0;
        const maxAttempts = 1000;
        
        do {
            // Select random prefix
            const prefix = this.cellcardPrefixes[Math.floor(Math.random() * this.cellcardPrefixes.length)];
            
            // Generate 6 more digits to make total 9 digits
            const remainingDigits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
            
            phoneNumber = prefix + remainingDigits;
            attempts++;
            
            if (attempts >= maxAttempts) {
                this.showToast('Unable to generate unique number. Please allow duplicates.', 'error');
                return;
            }
        } while (!allowDuplicates && this.generatedNumbers.has(phoneNumber));
        
        // Add to generated numbers set
        this.generatedNumbers.add(phoneNumber);
        
        // Create generation record
        const generation = {
            number: phoneNumber,
            prefix: phoneNumber.substring(0, 3),
            timestamp: this.getCurrentTimestamp()
        };
        
        // Add to user history
        this.usersData[this.currentUser].history.phoneGenerations.push(generation);
        this.saveToLocalStorage();
        
        // Display result
        this.displayPhoneResult(generation);
        
        // Update history table
        this.updatePhoneHistory();
        
        this.showToast('Phone number generated!', 'success');
    }

    displayPhoneResult(generation) {
        const resultDiv = document.getElementById('phone-result');
        const phoneSpan = document.getElementById('generated-phone');
        const prefixSpan = document.getElementById('phone-prefix');
        
        phoneSpan.textContent = generation.number;
        prefixSpan.textContent = generation.prefix;
        
        resultDiv.style.display = 'block';
    }

    updateDashboard() {
        if (!this.isAuthenticated) return;
        
        const usernameDisplay = document.getElementById('username-display');
        const kitCalcCount = document.getElementById('kit-calc-count');
        const phoneGenCount = document.getElementById('phone-gen-count');
        const recentActivityList = document.getElementById('recent-activity-list');
        
        usernameDisplay.textContent = this.currentUser;
        
        const userData = this.usersData[this.currentUser];
        kitCalcCount.textContent = userData.history.kitCalculations.length;
        phoneGenCount.textContent = userData.history.phoneGenerations.length;
        
        // Update recent activity
        this.updateRecentActivity(recentActivityList);
    }

    updateRecentActivity(container) {
        const userData = this.usersData[this.currentUser];
        const allActivities = [];
        
        // Combine all activities
        userData.history.kitCalculations.forEach(calc => {
            allActivities.push({
                type: 'kit',
                description: `Kit calculation: ${calc.kitNumber} → ${calc.paddedResult}`,
                timestamp: calc.timestamp
            });
        });
        
        userData.history.phoneGenerations.forEach(gen => {
            allActivities.push({
                type: 'phone',
                description: `Generated phone: ${gen.number}`,
                timestamp: gen.timestamp
            });
        });
        
        // Sort by timestamp (newest first)
        allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Take first 5
        const recentActivities = allActivities.slice(0, 5);
        
        if (recentActivities.length === 0) {
            container.innerHTML = '<p class="no-activity">No recent activity</p>';
        } else {
            container.innerHTML = recentActivities.map(activity => `
                <div class="activity-item">
                    <div>${activity.description}</div>
                    <div class="activity-meta">${activity.timestamp}</div>
                </div>
            `).join('');
        }
    }

    updateKitHistory() {
        const userData = this.usersData[this.currentUser];
        const allCalculations = [...userData.history.kitCalculations].reverse(); // Show newest first
        
        // Apply filters
        this.kitPagination.filteredData = this.applyKitFilters(allCalculations);
        
        // Reset to first page if filter changed
        if (this.kitPagination.currentPage > Math.ceil(this.kitPagination.filteredData.length / this.kitPagination.entriesPerPage)) {
            this.kitPagination.currentPage = 1;
        }
        
        // Render table
        this.renderKitTable();
        
        // Update info and pagination
        this.updateKitInfo();
        this.renderKitPagination();
    }

    applyKitFilters(data) {
        let filtered = [...data];
        
        // Apply search filter
        if (this.kitPagination.searchTerm) {
            const searchTerm = this.kitPagination.searchTerm.toLowerCase();
            filtered = filtered.filter(calc => 
                calc.kitNumber.toLowerCase().includes(searchTerm) ||
                calc.rawResult.toLowerCase().includes(searchTerm) ||
                calc.paddedResult.toLowerCase().includes(searchTerm) ||
                calc.timestamp.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply column filter
        if (this.kitPagination.filterColumn && this.kitPagination.filterValue) {
            const filterValue = this.kitPagination.filterValue.toLowerCase();
            filtered = filtered.filter(calc => {
                switch (this.kitPagination.filterColumn) {
                    case 'input':
                        return calc.kitNumber.toLowerCase().includes(filterValue);
                    case 'raw':
                        return calc.rawResult.toLowerCase().includes(filterValue);
                    case 'result':
                        return calc.paddedResult.toLowerCase().includes(filterValue);
                    default:
                        return true;
                }
            });
        }
        
        return filtered;
    }

    renderKitTable() {
        const tbody = document.getElementById('kit-history-tbody');
        const filteredData = this.kitPagination.filteredData;
        const startIndex = (this.kitPagination.currentPage - 1) * this.kitPagination.entriesPerPage;
        const endIndex = startIndex + this.kitPagination.entriesPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No calculations found</td></tr>';
        } else {
            tbody.innerHTML = pageData.map((calc, index) => `
                <tr>
                    <td>${filteredData.length - (startIndex + index)}</td>
                    <td>${parseInt(calc.kitNumber).toLocaleString()}</td>
                    <td>${parseInt(calc.rawResult).toLocaleString()}</td>
                    <td><code>${calc.paddedResult}</code></td>
                    <td>${calc.timestamp}</td>
                    <td>
                        <button class="copy-btn" onclick="app.copyToClipboard('${calc.paddedResult}', this)">
                            Copy
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    updateKitInfo() {
        const total = this.kitPagination.filteredData.length;
        const startIndex = (this.kitPagination.currentPage - 1) * this.kitPagination.entriesPerPage + 1;
        const endIndex = Math.min(startIndex + this.kitPagination.entriesPerPage - 1, total);
        
        const infoText = total === 0 ? 
            'Showing 0 of 0 entries' : 
            `Showing ${startIndex} to ${endIndex} of ${total} entries`;
        
        document.getElementById('kit-showing-info').textContent = infoText;
    }

    renderKitPagination() {
        const total = this.kitPagination.filteredData.length;
        const totalPages = Math.ceil(total / this.kitPagination.entriesPerPage);
        const currentPage = this.kitPagination.currentPage;
        
        const paginationContainer = document.getElementById('kit-pagination');
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Previous button
        html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="app.goToKitPage(${currentPage - 1})">‹</button>`;
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            html += `<button onclick="app.goToKitPage(1)">1</button>`;
            if (startPage > 2) html += `<span class="ellipsis">...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="app.goToKitPage(${i})">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="ellipsis">...</span>`;
            html += `<button onclick="app.goToKitPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="app.goToKitPage(${currentPage + 1})">›</button>`;
        
        paginationContainer.innerHTML = html;
    }

    updatePhoneHistory() {
        const userData = this.usersData[this.currentUser];
        const allGenerations = [...userData.history.phoneGenerations].reverse(); // Show newest first
        
        // Apply filters
        this.phonePagination.filteredData = this.applyPhoneFilters(allGenerations);
        
        // Reset to first page if filter changed
        if (this.phonePagination.currentPage > Math.ceil(this.phonePagination.filteredData.length / this.phonePagination.entriesPerPage)) {
            this.phonePagination.currentPage = 1;
        }
        
        // Render table
        this.renderPhoneTable();
        
        // Update info and pagination
        this.updatePhoneInfo();
        this.renderPhonePagination();
    }

    applyPhoneFilters(data) {
        let filtered = [...data];
        
        // Apply search filter
        if (this.phonePagination.searchTerm) {
            const searchTerm = this.phonePagination.searchTerm.toLowerCase();
            filtered = filtered.filter(gen => 
                gen.number.toLowerCase().includes(searchTerm) ||
                gen.prefix.toLowerCase().includes(searchTerm) ||
                gen.timestamp.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply column filter
        if (this.phonePagination.filterColumn && this.phonePagination.filterValue) {
            const filterValue = this.phonePagination.filterValue.toLowerCase();
            filtered = filtered.filter(gen => {
                switch (this.phonePagination.filterColumn) {
                    case 'number':
                        return gen.number.toLowerCase().includes(filterValue);
                    case 'prefix':
                        return gen.prefix.toLowerCase().includes(filterValue);
                    default:
                        return true;
                }
            });
        }
        
        return filtered;
    }

    renderPhoneTable() {
        const tbody = document.getElementById('phone-history-tbody');
        const filteredData = this.phonePagination.filteredData;
        const startIndex = (this.phonePagination.currentPage - 1) * this.phonePagination.entriesPerPage;
        const endIndex = startIndex + this.phonePagination.entriesPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No phone numbers found</td></tr>';
        } else {
            tbody.innerHTML = pageData.map((gen, index) => `
                <tr>
                    <td>${filteredData.length - (startIndex + index)}</td>
                    <td><code>${gen.number}</code></td>
                    <td><code>${gen.prefix}</code></td>
                    <td>${gen.timestamp}</td>
                    <td>
                        <button class="copy-btn" onclick="app.copyToClipboard('${gen.number}', this)">
                            Copy
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    updatePhoneInfo() {
        const total = this.phonePagination.filteredData.length;
        const startIndex = (this.phonePagination.currentPage - 1) * this.phonePagination.entriesPerPage + 1;
        const endIndex = Math.min(startIndex + this.phonePagination.entriesPerPage - 1, total);
        
        const infoText = total === 0 ? 
            'Showing 0 of 0 entries' : 
            `Showing ${startIndex} to ${endIndex} of ${total} entries`;
        
        document.getElementById('phone-showing-info').textContent = infoText;
    }

    renderPhonePagination() {
        const total = this.phonePagination.filteredData.length;
        const totalPages = Math.ceil(total / this.phonePagination.entriesPerPage);
        const currentPage = this.phonePagination.currentPage;
        
        const paginationContainer = document.getElementById('phone-pagination');
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Previous button
        html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="app.goToPhonePage(${currentPage - 1})">‹</button>`;
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            html += `<button onclick="app.goToPhonePage(1)">1</button>`;
            if (startPage > 2) html += `<span class="ellipsis">...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="app.goToPhonePage(${i})">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="ellipsis">...</span>`;
            html += `<button onclick="app.goToPhonePage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="app.goToPhonePage(${currentPage + 1})">›</button>`;
        
        paginationContainer.innerHTML = html;
    }

    updateAccountInfo() {
        const usernameSpan = document.getElementById('account-username');
        const kitCountSpan = document.getElementById('account-kit-count');
        const phoneCountSpan = document.getElementById('account-phone-count');
        
        const userData = this.usersData[this.currentUser];
        usernameSpan.textContent = this.currentUser;
        kitCountSpan.textContent = userData.history.kitCalculations.length;
        phoneCountSpan.textContent = userData.history.phoneGenerations.length;
    }

    async exportUserData() {
        // Export full XML database instead of just current user
        await this.saveToXML();
        this.showToast('Full XML database exported!', 'success');
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
            const userData = this.usersData[this.currentUser];
            userData.history.kitCalculations = [];
            userData.history.phoneGenerations = [];
            
            this.saveToLocalStorage();
            
            // Update all displays
            this.updateDashboard();
            this.updateKitHistory();
            this.updatePhoneHistory();
            this.updateAccountInfo();
            
            // Clear generated numbers
            this.generatedNumbers.clear();
            
            this.showToast('History cleared successfully', 'success');
        }
    }

    resetDemo() {
        if (confirm('This will reset all demo data and log you out. Continue?')) {
            localStorage.clear();
            location.reload();
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
    }

    handleResize() {
        // Close sidebar on larger screens
        if (window.innerWidth > 768) {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.remove('open');
        }
    }

    showAuthSection() {
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
        
        // Prevent scrolling when auth is shown
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100vh';
        document.documentElement.style.overflow = 'hidden';
    }

    showMainApp() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        
        // Restore scrolling for main app - be very explicit
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        document.documentElement.style.overflow = 'auto';
        document.documentElement.style.height = 'auto';
        
        // Also ensure #app can scroll
        const appElement = document.getElementById('app');
        if (appElement) {
            appElement.style.overflow = 'visible';
            appElement.style.height = 'auto';
        }
        
        // Clear all active nav states first
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        
        // Show dashboard by default
        this.showPage('dashboard');
        document.querySelector('.nav-link[data-page="dashboard"]').classList.add('active');
    }

    showLoginForm(e) {
        e.preventDefault();
        document.getElementById('login-form').classList.add('active');
        document.getElementById('register-form').classList.remove('active');
    }

    showRegisterForm(e) {
        e.preventDefault();
        document.getElementById('login-form').classList.remove('active');
        document.getElementById('register-form').classList.add('active');
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = show ? 'flex' : 'none';
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<div class="toast-message">${message}</div>`;
        
        container.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    saveToLocalStorage() {
        localStorage.setItem('usersData', JSON.stringify(this.usersData));
    }

    async saveToXML() {
        try {
            // Show saving indicator
            this.showDatabaseStatus('Updating database...', 'saving');
            
            // Update XML document with current user data
            this.updateXMLDocument();
            
            // Convert XML document to string
            const serializer = new XMLSerializer();
            const xmlString = serializer.serializeToString(this.xmlDocument);
            
            // Format the XML string nicely
            const formattedXml = this.formatXML(xmlString);
            
            // In a real application, you would send this to a server
            // For demo purposes, we'll create a download link
            this.downloadXMLFile(formattedXml);
            
            this.showDatabaseStatus('Database updated successfully!', 'success');
            console.log('XML data prepared for download');
            return true;
        } catch (error) {
            this.showDatabaseStatus('Database update failed', 'error');
            console.error('Error saving to XML:', error);
            return false;
        }
    }

    updateXMLDocument() {
        // Clear existing users from XML
        const root = this.xmlDocument.documentElement;
        while (root.firstChild) {
            root.removeChild(root.firstChild);
        }

        // Add all users to XML
        Object.keys(this.usersData).forEach(username => {
            const userData = this.usersData[username];
            
            const userEl = this.xmlDocument.createElement('user');
            userEl.setAttribute('username', username);
            userEl.setAttribute('passwordHash', userData.passwordHash);
            
            const historyEl = this.xmlDocument.createElement('history');
            
            // Add kit calculations
            const kitCalcsEl = this.xmlDocument.createElement('kitCalculations');
            userData.history.kitCalculations.forEach(calc => {
                const calcEl = this.xmlDocument.createElement('calculation');
                calcEl.setAttribute('kitNumber', calc.kitNumber);
                calcEl.setAttribute('rawResult', calc.rawResult);
                calcEl.setAttribute('paddedResult', calc.paddedResult);
                calcEl.setAttribute('timestamp', calc.timestamp);
                kitCalcsEl.appendChild(calcEl);
            });
            historyEl.appendChild(kitCalcsEl);
            
            // Add phone generations
            const phoneGensEl = this.xmlDocument.createElement('phoneGenerations');
            userData.history.phoneGenerations.forEach(gen => {
                const genEl = this.xmlDocument.createElement('generation');
                genEl.setAttribute('number', gen.number);
                genEl.setAttribute('prefix', gen.prefix);
                genEl.setAttribute('timestamp', gen.timestamp);
                phoneGensEl.appendChild(genEl);
            });
            historyEl.appendChild(phoneGensEl);
            
            userEl.appendChild(historyEl);
            root.appendChild(userEl);
        });
    }

    formatXML(xmlString) {
        const PADDING = '    '; // 4 spaces for indentation
        const reg = /(>)(<)(\/*)/g;
        let pad = 0;
        
        xmlString = xmlString.replace(reg, '$1\r\n$2$3');
        
        return xmlString.split('\r\n').map((node, index) => {
            let indent = 0;
            if (node.match(/.+<\/\w[^>]*>$/)) {
                indent = 0;
            } else if (node.match(/^<\/\w/) && pad > 0) {
                pad -= 1;
            } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
                indent = 1;
            } else {
                indent = 0;
            }
            
            pad += indent;
            
            return PADDING.repeat(pad - indent) + node;
        }).join('\r\n');
    }

    downloadXMLFile(xmlContent) {
        // Add XML declaration if not present
        if (!xmlContent.startsWith('<?xml')) {
            xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent;
        }
        
        const blob = new Blob([xmlContent], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'users.xml';
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        // Show detailed instructions to user
        this.showDatabaseUpdateInstructions(xmlContent);
    }

    showDatabaseUpdateInstructions(xmlContent) {
        const modal = document.createElement('div');
        modal.className = 'database-update-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <h3>📊 Database Updated</h3>
                    <p>Your XML database has been updated and downloaded. To persist the changes:</p>
                    <ol>
                        <li>Check your Downloads folder for <strong>users.xml</strong></li>
                        <li>Replace the file at <strong>data/users.xml</strong> in your project</li>
                        <li>Or copy the content below to your users.xml file</li>
                    </ol>
                    
                    <div class="xml-preview">
                        <h4>Updated XML Content:</h4>
                        <textarea readonly rows="15" cols="60">${xmlContent}</textarea>
                        <button class="copy-xml-btn" onclick="this.parentElement.querySelector('textarea').select(); document.execCommand('copy'); this.textContent='Copied!'">Copy XML</button>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="close-modal-btn">Got it!</button>
                    </div>
                </div>
            </div>
        `;

        // Add styles for the modal
        const style = document.createElement('style');
        style.textContent = `
            .database-update-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
            }
            
            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-content {
                background: var(--bg-secondary);
                border-radius: 12px;
                padding: 2rem;
                max-width: 80%;
                max-height: 80%;
                overflow-y: auto;
                border: 1px solid var(--border-color);
            }
            
            .xml-preview {
                margin: 1rem 0;
            }
            
            .xml-preview textarea {
                width: 100%;
                background: var(--bg-primary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 1rem;
                font-family: monospace;
                font-size: 0.9rem;
            }
            
            .copy-xml-btn {
                margin-top: 0.5rem;
                padding: 0.5rem 1rem;
                background: var(--primary-color);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }
            
            .modal-actions {
                margin-top: 1rem;
                text-align: right;
            }
            
            .close-modal-btn {
                padding: 0.8rem 1.5rem;
                background: var(--primary-color);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
            }
            
            .close-modal-btn:hover {
                background: var(--primary-hover);
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);

        // Close modal handlers
        const closeBtn = modal.querySelector('.close-modal-btn');
        const overlay = modal.querySelector('.modal-overlay');
        
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            document.head.removeChild(style);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(modal);
                document.head.removeChild(style);
            }
        });

        this.showToast('Database updated! Check the modal for instructions.', 'success');
    }

    showDatabaseStatus(message, type) {
        // Remove existing status indicator
        const existingStatus = document.querySelector('.database-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        // Create new status indicator
        const statusDiv = document.createElement('div');
        statusDiv.className = `database-status ${type}`;
        statusDiv.innerHTML = `
            <div class="status-content">
                <span class="status-icon">${type === 'saving' ? '💾' : type === 'success' ? '✅' : '❌'}</span>
                <span class="status-message">${message}</span>
            </div>
        `;

        // Add styles if not already present
        if (!document.querySelector('#database-status-styles')) {
            const style = document.createElement('style');
            style.id = 'database-status-styles';
            style.textContent = `
                .database-status {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    z-index: 9999;
                    animation: slideIn 0.3s ease-out;
                    min-width: 250px;
                }

                .database-status.saving {
                    border-left: 4px solid #3b82f6;
                }

                .database-status.success {
                    border-left: 4px solid #10b981;
                }

                .database-status.error {
                    border-left: 4px solid #ef4444;
                }

                .status-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .status-icon {
                    font-size: 1.2em;
                }

                .status-message {
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(statusDiv);

        // Auto remove after delay (longer for saving status)
        const delay = type === 'saving' ? 3000 : 2000;
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => {
                    if (statusDiv.parentNode) {
                        statusDiv.parentNode.removeChild(statusDiv);
                    }
                }, 300);
            }
        }, delay);
    }

    getCurrentTimestamp() {
        const now = new Date();
        return now.getFullYear() + '-' +
               String(now.getMonth() + 1).padStart(2, '0') + '-' +
               String(now.getDate()).padStart(2, '0') + ' ' +
               String(now.getHours()).padStart(2, '0') + ':' +
               String(now.getMinutes()).padStart(2, '0') + ':' +
               String(now.getSeconds()).padStart(2, '0');
    }

    // Kit Calculator filtering and pagination methods
    filterKitHistory() {
        this.kitPagination.searchTerm = document.getElementById('kit-search').value.trim();
        this.kitPagination.filterValue = document.getElementById('kit-filter-value').value.trim();
        this.kitPagination.currentPage = 1;
        this.updateKitHistory();
    }

    clearKitSearch() {
        document.getElementById('kit-search').value = '';
        this.kitPagination.searchTerm = '';
        this.kitPagination.currentPage = 1;
        this.updateKitHistory();
    }

    handleKitFilterColumn(e) {
        this.kitPagination.filterColumn = e.target.value;
        const filterInput = document.getElementById('kit-filter-value');
        filterInput.disabled = !e.target.value;
        if (!e.target.value) {
            filterInput.value = '';
            this.kitPagination.filterValue = '';
        }
        this.filterKitHistory();
    }

    handleKitEntriesPerPageChange(e) {
        this.kitPagination.entriesPerPage = parseInt(e.target.value);
        this.kitPagination.currentPage = 1;
        this.updateKitHistory();
    }

    goToKitPage(page) {
        this.kitPagination.currentPage = page;
        this.updateKitHistory();
    }

    clearKitHistory() {
        if (confirm('Are you sure you want to clear all calculation history? This cannot be undone.')) {
            this.usersData[this.currentUser].history.kitCalculations = [];
            this.saveToLocalStorage();
            this.kitPagination.currentPage = 1;
            this.updateKitHistory();
            this.showToast('Kit calculation history cleared', 'success');
        }
    }

    // Phone Generator filtering and pagination methods
    filterPhoneHistory() {
        this.phonePagination.searchTerm = document.getElementById('phone-search').value.trim();
        this.phonePagination.filterValue = document.getElementById('phone-filter-value').value.trim();
        this.phonePagination.currentPage = 1;
        this.updatePhoneHistory();
    }

    clearPhoneSearch() {
        document.getElementById('phone-search').value = '';
        this.phonePagination.searchTerm = '';
        this.phonePagination.currentPage = 1;
        this.updatePhoneHistory();
    }

    handlePhoneFilterColumn(e) {
        this.phonePagination.filterColumn = e.target.value;
        const filterInput = document.getElementById('phone-filter-value');
        filterInput.disabled = !e.target.value;
        if (!e.target.value) {
            filterInput.value = '';
            this.phonePagination.filterValue = '';
        }
        this.filterPhoneHistory();
    }

    handlePhoneEntriesPerPageChange(e) {
        this.phonePagination.entriesPerPage = parseInt(e.target.value);
        this.phonePagination.currentPage = 1;
        this.updatePhoneHistory();
    }

    goToPhonePage(page) {
        this.phonePagination.currentPage = page;
        this.updatePhoneHistory();
    }

    clearPhoneHistory() {
        if (confirm('Are you sure you want to clear all phone generation history? This cannot be undone.')) {
            this.usersData[this.currentUser].history.phoneGenerations = [];
            this.saveToLocalStorage();
            this.phonePagination.currentPage = 1;
            this.updatePhoneHistory();
            this.showToast('Phone generation history cleared', 'success');
        }
    }

    // Copy to clipboard functionality
    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
            
            this.showToast(`Copied "${text}" to clipboard`, 'success');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                button.textContent = 'Copied!';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.textContent = 'Copy';
                    button.classList.remove('copied');
                }, 2000);
                
                this.showToast(`Copied "${text}" to clipboard`, 'success');
            } catch (fallbackErr) {
                this.showToast('Failed to copy to clipboard', 'error');
            }
            
            document.body.removeChild(textArea);
        }
    }
}

// Initialize the application when DOM is loaded
let app; // Global reference for onclick handlers

document.addEventListener('DOMContentLoaded', () => {
    app = new KitCalculatorApp();
});
