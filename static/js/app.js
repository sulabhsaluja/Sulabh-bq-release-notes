// BigQuery Release Notes Web App - Logic

document.addEventListener('DOMContentLoaded', () => {
    // App State
    let rawEntries = [];
    let parsedItems = [];
    let activeFilter = 'All';
    let searchQuery = '';
    let sortOrder = 'desc'; // 'desc' for newest first, 'asc' for oldest first
    let activeTweetItem = null;

    // DOM Elements
    const refreshBtn = document.getElementById('btn-refresh');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const filterChipsContainer = document.getElementById('filter-chips');
    const timelineContainer = document.getElementById('timeline-container');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const emptyState = document.getElementById('empty-state');
    const btnExport = document.getElementById('btn-export');
    const themeToggleBtn = document.getElementById('btn-theme-toggle');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const btnEmptyReset = document.getElementById('btn-empty-reset');
    const btnEmptyRetry = document.getElementById('btn-empty-retry');
    
    // Stats Elements
    const statTotal = document.getElementById('stat-total');
    const statFeatures = document.getElementById('stat-features');
    const statChanges = document.getElementById('stat-changes');
    const statFixes = document.getElementById('stat-fixes');

    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountText = document.getElementById('char-count-text');
    const progressCircle = document.getElementById('progress-circle');
    const charCircle = document.getElementById('char-circle');
    const btnPostTweet = document.getElementById('btn-post-tweet');
    const btnCopyTweet = document.getElementById('btn-copy-tweet');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const hashtagChips = document.getElementById('hashtag-chips');
    const btnTrimTweet = document.getElementById('btn-trim-tweet');

    // Toast Notification Elements
    const toastContainer = document.getElementById('toast-container');

    // Initial Fetch
    fetchReleaseNotes();

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        searchClearBtn.style.display = searchQuery ? 'flex' : 'none';
        renderTimeline();
    });

    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        renderTimeline();
        searchInput.focus();
    });

    sortSelect.addEventListener('change', (e) => {
        sortOrder = e.target.value;
        renderTimeline();
    });

    btnExport.addEventListener('click', exportToCSV);

    btnEmptyReset.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        activeFilter = 'All';
        
        filterChipsContainer.querySelectorAll('.chip').forEach(c => {
            if (c.getAttribute('data-filter') === 'All') {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        });
        
        renderTimeline();
    });

    btnEmptyRetry.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    btnTrimTweet.addEventListener('click', () => {
        if (!activeTweetItem) return;
        const headerText = `BigQuery Release (${activeTweetItem.date}):\n📍 [${activeTweetItem.type}]\n\n`;
        const footerText = `\n\nRead more: ${activeTweetItem.link}\n#BigQuery #GCP`;
        const limit = 280;
        const metaLen = headerText.length + footerText.length;
        const maxBodyLen = limit - metaLen;
        
        let bodyText = activeTweetItem.rawText;
        if (bodyText.length > maxBodyLen) {
            bodyText = bodyText.substring(0, maxBodyLen - 3) + '...';
        }
        
        tweetTextarea.value = headerText + bodyText + footerText;
        
        // Match hashtag chip selected classes with new text contents
        hashtagChips.querySelectorAll('.hashtag-chip').forEach(chip => {
            const tag = chip.textContent;
            if (tweetTextarea.value.includes(tag)) {
                chip.classList.add('selected');
            } else {
                chip.classList.remove('selected');
            }
        });

        updateTweetComposerStatus();
        showToast('Tweet text trimmed to fit limit!');
    });

    // Theme Switcher Logic
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleBtn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
    }

    themeToggleBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
        if (isLight) {
            themeToggleBtn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
            showToast('Switched to Light theme');
        } else {
            themeToggleBtn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>`;
            showToast('Switched to Dark theme');
        }
    });

    // Close Modal on click outside content
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    btnCloseModal.addEventListener('click', closeTweetModal);
    btnCancelModal.addEventListener('click', closeTweetModal);
    
    // Tweet Actions
    tweetTextarea.addEventListener('input', updateTweetComposerStatus);
    
    btnCopyTweet.addEventListener('click', () => {
        navigator.clipboard.writeText(tweetTextarea.value)
            .then(() => showToast('Tweet copied to clipboard!'))
            .catch(err => console.error('Error copying text: ', err));
    });

    btnPostTweet.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    });

    // Add hashtag click behavior (multi-select toggling)
    hashtagChips.addEventListener('click', (e) => {
        if (e.target.classList.contains('hashtag-chip')) {
            const chip = e.target;
            const hashtag = chip.textContent;
            let currentVal = tweetTextarea.value;
            
            if (chip.classList.contains('selected')) {
                chip.classList.remove('selected');
                // Remove hashtag from composer text (handling whitespace padding)
                const regex = new RegExp('\\s*' + escapeRegExp(hashtag), 'g');
                tweetTextarea.value = currentVal.replace(regex, '').trim();
            } else {
                chip.classList.add('selected');
                if (!currentVal.includes(hashtag)) {
                    tweetTextarea.value = currentVal.trim() + ' ' + hashtag;
                }
            }
            updateTweetComposerStatus();
        }
    });

    // Close Modal with Escape key & Search shortcut '/'
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetModal();
        }
        
        // Focus search when '/' is pressed (excluding input fields and active modal)
        if (e.key === '/' && document.activeElement !== searchInput && !tweetModal.classList.contains('active')) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });

    // Helper functions

    // Parse a single Atom entry content
    function parseReleaseEntry(entry) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(entry.content, 'text/html');
        const items = [];
        let currentItem = null;
        let itemIndex = 0;

        const children = Array.from(doc.body.children);

        if (children.length === 0) {
            // Fallback: if no element structure, treat entire body as a single item
            const plainText = doc.body.textContent.trim();
            if (plainText) {
                items.push({
                    id: `${entry.id}_0`,
                    date: entry.title,
                    link: entry.link,
                    type: 'Update',
                    content: entry.content,
                    rawText: plainText
                });
            }
            return items;
        }

        children.forEach(child => {
            if (child.tagName.match(/^H[1-6]$/i)) {
                // Header indicates new type
                const rawType = child.textContent.trim();
                let cleanType = rawType;
                
                // Map to normalized type names
                const lowerType = rawType.toLowerCase();
                if (lowerType.includes('feature')) cleanType = 'Feature';
                else if (lowerType.includes('changed') || lowerType.includes('change')) cleanType = 'Changed';
                else if (lowerType.includes('deprecated')) cleanType = 'Deprecated';
                else if (lowerType.includes('fixed') || lowerType.includes('fix')) cleanType = 'Fixed';
                else if (lowerType.includes('known issue')) cleanType = 'Known Issue';
                
                currentItem = {
                    id: `${entry.id}_${itemIndex++}`,
                    date: entry.title,
                    link: entry.link,
                    type: cleanType,
                    content: '',
                    rawText: ''
                };
                items.push(currentItem);
            } else {
                // Sibling content
                if (!currentItem) {
                    currentItem = {
                        id: `${entry.id}_${itemIndex++}`,
                        date: entry.title,
                        link: entry.link,
                        type: 'Update',
                        content: '',
                        rawText: ''
                    };
                    items.push(currentItem);
                }
                currentItem.content += child.outerHTML;
                
                // Add clean text spacer
                const blockText = child.textContent.trim();
                if (blockText) {
                    currentItem.rawText += (currentItem.rawText ? '\n' : '') + blockText;
                }
            }
        });

        // If some items ended up empty, filter them out
        return items.filter(item => item.content.trim() !== '' || item.rawText.trim() !== '');
    }

    // Process all entries from API
    function processEntries(entries) {
        let items = [];
        entries.forEach(entry => {
            const entryItems = parseReleaseEntry(entry);
            items.push(...entryItems);
        });
        return items;
    }

    // Fetch release notes API
    function fetchReleaseNotes(forceRefresh = false) {
        // Show loading state
        refreshBtn.classList.add('loading');
        statusDot.className = 'status-dot loading';
        statusText.textContent = forceRefresh ? 'Fetching fresh feed...' : 'Loading feed data...';
        
        skeletonLoader.style.display = 'block';
        timelineContainer.style.display = 'none';
        emptyState.style.display = 'none';

        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('API server returned error');
                return res.json();
            })
            .then(res => {
                if (res.status === 'success') {
                    rawEntries = res.data;
                    parsedItems = processEntries(rawEntries);
                    
                    // Update Status text
                    const dateStr = new Date().toLocaleTimeString();
                    if (res.source === 'cache') {
                        statusText.textContent = `Using cached data (Loaded at ${dateStr})`;
                    } else {
                        statusText.textContent = `Updated successfully at ${dateStr}`;
                    }
                    statusDot.className = 'status-dot';
                    
                    // Render Dashboard Controls
                    updateStats();
                    renderFilterChips();
                    renderTimeline();
                } else {
                    throw new Error(res.message || 'Unknown backend error');
                }
            })
            .catch(err => {
                console.error(err);
                statusText.textContent = 'Error: Failed to load release notes.';
                statusDot.className = 'status-dot';
                showToast('Failed to load release notes. Please check connection.', 'error');
                
                skeletonLoader.style.display = 'none';
                emptyState.style.display = 'block';
                
                // Show retry connection, hide reset filters
                btnEmptyReset.style.display = 'none';
                btnEmptyRetry.style.display = 'inline-flex';
                
                document.getElementById('empty-icon').textContent = '⚠️';
                document.getElementById('empty-title').textContent = 'Connection Failed';
                document.getElementById('empty-description').textContent = err.message || 'Unable to connect to the Flask server. Please check your network and try again.';
            })
            .finally(() => {
                refreshBtn.classList.remove('loading');
            });
    }

    // Update statistics dashboard card
    function updateStats() {
        statTotal.textContent = parsedItems.length;
        statFeatures.textContent = parsedItems.filter(i => i.type === 'Feature').length;
        statChanges.textContent = parsedItems.filter(i => i.type === 'Changed').length;
        statFixes.textContent = parsedItems.filter(i => i.type === 'Fixed').length;
    }

    // Build Category Filter Chips
    function renderFilterChips() {
        // Collect all available types
        const types = new Set();
        parsedItems.forEach(i => types.add(i.type));

        // Sorting types so they look neat
        const sortedTypes = Array.from(types).sort();
        
        // Count for All
        let html = `
            <button class="chip ${activeFilter === 'All' ? 'active' : ''}" data-filter="All">
                All <span class="chip-count">${parsedItems.length}</span>
            </button>
        `;

        sortedTypes.forEach(type => {
            const count = parsedItems.filter(i => i.type === type).length;
            html += `
                <button class="chip ${activeFilter === type ? 'active' : ''}" data-filter="${type}">
                    ${type} <span class="chip-count">${count}</span>
                </button>
            `;
        });

        filterChipsContainer.innerHTML = html;

        // Add event listeners
        filterChipsContainer.querySelectorAll('.chip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                activeFilter = target.getAttribute('data-filter');
                
                // Toggle active class
                filterChipsContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                target.classList.add('active');
                
                renderTimeline();
            });
        });
    }

    // Sort and Filter elements to render
    function getFilteredAndSortedItems() {
        let items = [...parsedItems];

        // Apply Category Filter
        if (activeFilter !== 'All') {
            items = items.filter(i => i.type === activeFilter);
        }

        // Apply Text Search Filter
        if (searchQuery) {
            items = items.filter(i => {
                const textMatch = i.rawText.toLowerCase().includes(searchQuery);
                const typeMatch = i.type.toLowerCase().includes(searchQuery);
                const dateMatch = i.date.toLowerCase().includes(searchQuery);
                return textMatch || typeMatch || dateMatch;
            });
        }

        // Apply Sorting (based on date)
        // Group by Date text representation: "June 15, 2026"
        // Let's sort items by index / date
        // Since dates in XML are typically chronological, we can parse standard Date object
        items.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            
            // If dates are equal, fallback to ID sorting (index in entry)
            if (dateA.getTime() === dateB.getTime()) {
                return sortOrder === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id);
            }
            
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        return items;
    }

    // Highlight search match in text helper
    function highlightSearch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return text.replace(regex, '<mark class="highlight">$1</mark>');
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Render timeline UI
    function renderTimeline() {
        const filteredItems = getFilteredAndSortedItems();

        skeletonLoader.style.display = 'none';

        if (filteredItems.length === 0) {
            timelineContainer.style.display = 'none';
            emptyState.style.display = 'block';
            
            // Show Reset Filters button if search/category filters are active
            btnEmptyReset.style.display = (searchQuery || activeFilter !== 'All') ? 'inline-flex' : 'none';
            btnEmptyRetry.style.display = 'none';
            
            document.getElementById('empty-icon').textContent = '📂';
            document.getElementById('empty-title').textContent = 'No matching updates found';
            document.getElementById('empty-description').textContent = 'Try resetting filters or searching for something else.';
            return;
        }

        emptyState.style.display = 'none';
        btnEmptyReset.style.display = 'none';
        btnEmptyRetry.style.display = 'none';
        timelineContainer.style.display = 'block';

        // Group items by date to build the timeline view
        const groups = {};
        filteredItems.forEach(item => {
            if (!groups[item.date]) {
                groups[item.date] = [];
            }
            groups[item.date].push(item);
        });

        // Sort the group dates based on sortOrder
        const sortedDates = Object.keys(groups).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        let timelineHtml = '';
        sortedDates.forEach(date => {
            timelineHtml += `
                <div class="timeline-group">
                    <div class="timeline-date-marker">
                        <div class="timeline-dot"></div>
                        <div class="timeline-date-text">${date}</div>
                    </div>
                    <div class="timeline-items">
            `;

            groups[date].forEach(item => {
                const badgeClass = item.type.toLowerCase().replace(/\s+/g, '-');
                const cleanBadgeClass = ['feature', 'changed', 'deprecated', 'fixed'].includes(badgeClass) ? badgeClass : 'default';

                // Highlight content/type if search is active
                let displayType = item.type;
                let displayContent = item.content;
                
                if (searchQuery) {
                    displayType = highlightSearch(item.type, searchQuery);
                    // For safety, we highlight text within elements without destroying tags.
                    // A simple highlight on textContent could break HTML tags.
                    // So we do a text nodes replacement in parsed HTML instead.
                    displayContent = highlightHtmlText(item.content, searchQuery);
                }

                timelineHtml += `
                    <div class="release-card" data-id="${item.id}">
                        <div class="card-header">
                            <span class="type-badge ${cleanBadgeClass}">${displayType}</span>
                            <div class="card-actions">
                                <button class="action-btn btn-copy" data-id="${item.id}">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                                    Copy
                                </button>
                                <button class="action-btn btn-tweet-action" data-id="${item.id}">
                                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    Tweet
                                </button>
                            </div>
                        </div>
                        <div class="card-content">${displayContent}</div>
                    </div>
                `;
            });

            timelineHtml += `
                    </div>
                </div>
            `;
        });

        timelineContainer.innerHTML = timelineHtml;

        // Register Action Listeners
        timelineContainer.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const item = parsedItems.find(i => i.id === id);
                if (item) {
                    // Combine date, type and raw text for a beautiful copy format
                    const copyText = `BigQuery Release - ${item.date}\n[${item.type.toUpperCase()}]\n\n${item.rawText}\n\nRead more: ${item.link}`;
                    
                    navigator.clipboard.writeText(copyText)
                        .then(() => {
                            showToast('Release note copied to clipboard!');
                        })
                        .catch(err => {
                            console.error('Error copying text:', err);
                            showToast('Failed to copy text', 'error');
                        });
                }
            });
        });

        timelineContainer.querySelectorAll('.btn-tweet-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const item = parsedItems.find(i => i.id === id);
                if (item) {
                    openTweetComposer(item);
                }
            });
        });
    }

    // Safe HTML text search highlight. Modifies only the TextNodes inside HTML.
    function highlightHtmlText(htmlContent, query) {
        if (!query) return htmlContent;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        const walk = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while (node = walk.nextNode()) {
            textNodes.push(node);
        }
        
        textNodes.forEach(node => {
            const text = node.nodeValue;
            if (text.toLowerCase().includes(query)) {
                const span = document.createElement('span');
                span.innerHTML = highlightSearch(text, query);
                node.parentNode.replaceChild(span, node);
            }
        });
        
        return doc.body.innerHTML;
    }

    // Modal Manager
    function openTweetComposer(item) {
        activeTweetItem = item;
        
        // Generate pre-populated text
        // Clean release text up to fit in Twitter intent safely
        const headerText = `BigQuery Release (${item.date}):\n📍 [${item.type}]\n\n`;
        const footerText = `\n\nRead more: ${item.link}\n#BigQuery #GCP`;
        
        // We calculate max characters for the body text
        const maxLimit = 280;
        const metaLen = headerText.length + footerText.length;
        const maxBodyLen = maxLimit - metaLen;
        
        let bodyText = item.rawText;
        if (bodyText.length > maxBodyLen) {
            // Smart truncation
            bodyText = bodyText.substring(0, maxBodyLen - 3) + '...';
        }
        
        const fullTweetText = headerText + bodyText + footerText;
        
        tweetTextarea.value = fullTweetText;
        tweetModal.classList.add('active');
        
        // Synchronize selected state of hashtag chips based on text contents
        hashtagChips.querySelectorAll('.hashtag-chip').forEach(chip => {
            const tag = chip.textContent;
            if (fullTweetText.includes(tag)) {
                chip.classList.add('selected');
            } else {
                chip.classList.remove('selected');
            }
        });

        updateTweetComposerStatus();
        tweetTextarea.focus();
    }

    function closeTweetModal() {
        tweetModal.classList.remove('active');
        activeTweetItem = null;
    }

    // Calculate Twitter character metrics (Standard character limit is 280)
    function updateTweetComposerStatus() {
        const text = tweetTextarea.value;
        const count = text.length;
        const limit = 280;
        
        charCountText.textContent = `${count} / ${limit}`;
        
        // SVG circle drawing metric
        const radius = 12;
        const circumference = 2 * Math.PI * radius;
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        
        if (count > limit) {
            charCountText.classList.add('danger');
            charCircle.className = 'char-circle danger';
            btnPostTweet.disabled = true;
            btnTrimTweet.style.display = 'inline-flex'; // Show Trim to Fit button
            progressCircle.style.strokeDashoffset = 0;
        } else {
            charCountText.classList.remove('danger');
            btnPostTweet.disabled = false;
            btnTrimTweet.style.display = 'none'; // Hide Trim to Fit button
            
            const percentage = count / limit;
            const offset = circumference - (percentage * circumference);
            progressCircle.style.strokeDashoffset = offset;
            
            if (limit - count <= 20) {
                charCircle.className = 'char-circle danger';
            } else if (limit - count <= 60) {
                charCircle.className = 'char-circle warning';
            } else {
                charCircle.className = 'char-circle';
            }
        }
    }

    // Create and trigger toast alerts
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        const icon = type === 'success' 
            ? `<span class="toast-success-icon"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></span>`
            : `<span class="toast-success-icon" style="color:var(--gcloud-red)"><svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></span>`;
            
        toast.innerHTML = `
            ${icon}
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Trigger reflow for slide in transition
        toast.offsetHeight;
        toast.classList.add('show');
        
        // Auto remove after 3s
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // Export currently filtered & sorted release notes to CSV
    function exportToCSV() {
        const filteredItems = getFilteredAndSortedItems();
        if (filteredItems.length === 0) {
            showToast('No items to export', 'error');
            return;
        }

        // CSV Headers
        const headers = ['Date', 'Type', 'Description', 'Link'];
        
        // Convert items to CSV rows
        const rows = filteredItems.map(item => {
            // Escape double quotes and remove newlines for clean CSV lines
            const cleanText = item.rawText
                .replace(/"/g, '""')
                .replace(/\r?\n|\r/g, ' ');
                
            return [
                `"${item.date}"`,
                `"${item.type}"`,
                `"${cleanText}"`,
                `"${item.link}"`
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        
        // Create a blob and download it
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Exported CSV successfully!');
    }
});
