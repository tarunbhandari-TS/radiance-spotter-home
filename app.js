(() => {
    const askForm = document.getElementById("ask-form");
    const askInput = document.getElementById("ask-input");
    const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
    const navLinks = Array.from(document.querySelectorAll(".nav-link"));
    const railButtons = Array.from(document.querySelectorAll(".rail-button"));
    const sidebarTitle = document.getElementById("sidebar-title");
    const mobileMenuButton = document.getElementById("mobile-menu-button");
    const sidebar = document.getElementById("sidebar");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const notificationButton = document.getElementById("notification-button");
    const notificationPopover = document.getElementById("notification-popover");
    const themeToggle = document.getElementById("theme-toggle");
    const addKpiButton = document.getElementById("add-kpi");
    const watchlist = document.getElementById("watchlist");
    const explorationButton = document.getElementById("exploration-button");
    const explorationPopover = document.getElementById("exploration-popover");
    const explorationClose = document.getElementById("exploration-close");
    const variationButtons = Array.from(document.querySelectorAll("[data-variation]"));
    const DEFAULT_THEME = "dark";
    const DEFAULT_VARIATION = "top-wash";
    let nextKpiIndex = 0;

    const kpiQueue = [
        ["Inventory Aging by Region", "WoW", "3.8M", "+4.28%", "up"],
        ["Open Opportunities by Segment", "MoM", "17.42M", "+8.11%", "up"],
        ["Support Escalations by Product", "WoW", "294", "-6.40%", "down"]
    ];

    function setTheme(theme) {
        const safeTheme = theme === "dark" ? "dark" : "light";
        document.documentElement.dataset.theme = safeTheme;
        localStorage.setItem("radiance-home-theme", safeTheme);

        themeToggle.setAttribute("aria-pressed", String(safeTheme === "dark"));
        themeToggle.setAttribute("aria-label", safeTheme === "dark" ? "Switch to light mode" : "Switch to dark mode");
        window.Background.setTheme();
    }

    function toggleTheme() {
        setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    }

    function setMode(mode) {
        modeButtons.forEach((button) => {
            const isActive = button.dataset.mode === mode;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", String(isActive));
        });
    }

    function resizeAskInput() {
        if (!askInput) return;
        askInput.style.height = "auto";
        askInput.style.height = `${Math.min(150, askInput.scrollHeight)}px`;
    }

    function wigglePromptBar() {
        const card = document.querySelector(".prompt-bar-card");
        if (!card) return;
        card.classList.remove("is-wiggling");
        // Force reflow so the animation can retrigger on rapid repeat clicks.
        void card.offsetWidth;
        card.classList.add("is-wiggling");
        card.addEventListener("animationend", () => card.classList.remove("is-wiggling"), { once: true });
    }

    function submitQuery(event) {
        event.preventDefault();
        if (!askInput || !askInput.value.trim()) {
            wigglePromptBar();
            if (askInput) askInput.focus();
            return;
        }
        runSpotterTransition();
    }

    function setActiveNav(target) {
        navLinks.forEach((link) => link.classList.toggle("is-active", link === target));
        if (window.matchMedia("(max-width: 860px)").matches) closeSidebar();
    }

    function setActiveRail(target) {
        railButtons.forEach((button) => {
            const isActive = button === target;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", String(isActive));
        });
        sidebarTitle.textContent = target.dataset.rail;
    }

    function openSidebar() {
        sidebar.classList.add("is-open");
        sidebarBackdrop.hidden = false;
        mobileMenuButton.setAttribute("aria-label", "Close navigation");
    }

    function closeSidebar() {
        sidebar.classList.remove("is-open");
        sidebarBackdrop.hidden = true;
        mobileMenuButton.setAttribute("aria-label", "Open navigation");
    }

    function toggleNotifications() {
        const willOpen = !notificationPopover.classList.contains("is-open");
        notificationPopover.classList.toggle("is-open", willOpen);
        notificationButton.setAttribute("aria-expanded", String(willOpen));
    }

    function closeNotifications() {
        notificationPopover.classList.remove("is-open");
        notificationButton.setAttribute("aria-expanded", "false");
    }

    function openExploration() {
        explorationPopover.hidden = false;
        explorationPopover.classList.add("is-open");
        explorationButton.setAttribute("aria-expanded", "true");
        explorationClose.focus();
    }

    function closeExploration() {
        explorationPopover.classList.remove("is-open");
        explorationPopover.hidden = true;
        explorationButton.setAttribute("aria-expanded", "false");
    }

    function toggleExploration() {
        if (explorationPopover.hidden) openExploration();
        else closeExploration();
    }

    function applyVariation(variationName) {
        const name = variationName || DEFAULT_VARIATION;
        window.Background.applyVariation(name);

        if (!window.Background.isFocusVariation() || !askForm || !askForm.contains(document.activeElement)) {
            window.Background.setQueryFocus(false);
        }
        variationButtons.forEach((button) => {
            const isActive = button.dataset.variation === window.Background.activeVariation;
            button.classList.toggle("is-selected", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function setVariation(target) {
        applyVariation(target.dataset.variation || DEFAULT_VARIATION);
    }

    function addKpi() {
        const [name, cadence, value, trend, direction] = kpiQueue[nextKpiIndex % kpiQueue.length];
        nextKpiIndex += 1;

        const row = document.createElement("div");
        row.className = "watch-row";
        row.innerHTML = `
            <span><strong>${name}</strong><small>${cadence}</small></span>
            <span><strong>${value}</strong><small class="${direction === "up" ? "trend-up" : "trend-down"}">${trend}</small></span>
        `;
        watchlist.prepend(row);
    }

    function handleDocumentClick(event) {
        if (!notificationPopover.contains(event.target) && !notificationButton.contains(event.target)) {
            closeNotifications();
        }

        if (!explorationPopover.hidden && !explorationPopover.contains(event.target) && !explorationButton.contains(event.target)) {
            closeExploration();
        }
    }

    function handleDocumentPointerDown(event) {
        if (askForm && askForm.contains(event.target)) {
            if (window.Background.isFocusVariation()) window.Background.setQueryFocus(true);
            return;
        }

        window.Background.setQueryFocus(false, document.documentElement.dataset.queryFocus === "true");
    }

    function handleKeydown(event) {
        if (event.key === "Escape") {
            closeSidebar();
            closeNotifications();
            closeExploration();
            closeModelMenu();
            if (qsCard && !qsCard.hidden) closeStarterCard(qsChip, qsCard);
            if (daCard && !daCard.hidden) closeStarterCard(daChip, daCard);
        }
    }

    const urlTheme = new URLSearchParams(window.location.search).get("theme");
    const urlVariation = new URLSearchParams(window.location.search).get("variation");
    const urlQueryFocus = new URLSearchParams(window.location.search).get("queryFocus");

    // ── Clean URL routing ─────────────────────────────────────────────────────────
    // Each page claims its canonical path so file names never appear in the URL.
    // BASE_PATH keeps this working whether the site is hosted at the domain root
    // (e.g. /Home) or under a sub-path (e.g. GitHub Pages: /repo/Home).
    const BASE_PATH = window.location.pathname.replace(/[^/]*$/, ""); // dir incl. trailing slash
    if (document.body.classList.contains("spotter-page")) {
        history.replaceState({}, "", BASE_PATH + "Spotterhome");
    } else {
        history.replaceState({}, "", BASE_PATH + "Home");
    }
    // ─────────────────────────────────────────────────────────────────────────────

    setTheme(urlTheme === "dark" || urlTheme === "light" ? urlTheme : DEFAULT_THEME);
    applyVariation(urlVariation || DEFAULT_VARIATION);

    if (urlQueryFocus === "true" && askInput && window.Background.isFocusVariation()) {
        window.requestAnimationFrame(() => {
            askInput.focus({ preventScroll: true });
            window.Background.setQueryFocus(true);
        });
    }

    if (askForm && askInput) {
        askInput.addEventListener("input", function () {
            resizeAskInput();
        });

        // On first keypress, run typewriter with canned query
        askInput.addEventListener("keydown", function (e) {
            if (!inputLocked) return;
            // While typewriter is running, block all keys
            if (typewriterStarted && !typewriterDone) {
                e.preventDefault();
                return;
            }
            // After typewriter is done, only allow Enter (which submits); block everything else
            if (typewriterDone) {
                if (e.key !== 'Enter') e.preventDefault();
                return;
            }
            // First keypress — ignore modifier/navigation keys
            const ignore = ['Tab','Shift','Control','Alt','Meta','CapsLock','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];
            if (ignore.includes(e.key)) return;
            e.preventDefault();
            typewriterStarted = true;
            askInput.value = '';
            const QUERY = 'show me sales of last year';
            const chars = QUERY.split('');
            let i = 0;
            const tw = setInterval(() => {
                askInput.value += chars[i++];
                resizeAskInput();
                if (i >= chars.length) {
                    clearInterval(tw);
                    typewriterDone = true;
                }
            }, 55);
        });

        // Start focused (active state + gradient border)
        requestAnimationFrame(() => askInput.focus({ preventScroll: true }));
        askInput.addEventListener("focus", () => {
            if (window.Background.isFocusVariation()) window.Background.setQueryFocus(true);
        });
        askInput.addEventListener("blur", () => {
            if (!askForm.contains(document.activeElement)) window.Background.setQueryFocus(false, window.Background.isFocusVariation());
        });
        askForm.addEventListener("focusin", () => {
            window.Background._clearFocusTimer();
            if (window.Background.isFocusVariation()) window.Background.setQueryFocus(true);
        });
        askForm.addEventListener("focusout", () => {
            window.Background._setFocusTimer(() => {
                const isStillFocused = window.Background.isFocusVariation() && askForm.contains(document.activeElement);
                window.Background.setQueryFocus(isStillFocused, window.Background.isFocusVariation() && !isStillFocused);
            });
        });
        askForm.addEventListener("submit", submitQuery);

        const promptCard = askForm.querySelector(".prompt-bar-card");
        if (promptCard) {
            // Selecting anywhere in the box (not its buttons) focuses the input,
            // which drives the gradient stroke via :focus-within.
            promptCard.addEventListener("mousedown", (event) => {
                if (event.target === askInput || event.target.closest("button")) return;
                event.preventDefault();
                askInput.focus();
            });
        }
    }

    const addButton = document.getElementById("prompt-add-button");
    const addMenu = document.getElementById("prompt-add-menu");
    const deepAnalysisToggle = document.getElementById("deep-analysis-toggle");

    // Portal the menu to <body> so its fixed positioning escapes the prompt
    // bar's nested stacking contexts (otherwise it renders behind the panels).
    if (addMenu) document.body.appendChild(addMenu);

    function positionAddMenu() {
        // Anchor the fixed menu to the bottom-center of the "+" button.
        const rect = addButton.getBoundingClientRect();
        addMenu.style.left = `${rect.left + rect.width / 2}px`;
        addMenu.style.top = `${rect.bottom + 8}px`;
    }

    function closeAddMenu() {
        if (!addMenu || !addMenu.classList.contains("is-open")) return;
        addMenu.classList.remove("is-open");
        addButton.setAttribute("aria-expanded", "false");
        window.removeEventListener("scroll", positionAddMenu, true);
        window.removeEventListener("resize", positionAddMenu);
    }

    function openAddMenu() {
        positionAddMenu();
        addMenu.classList.add("is-open");
        addButton.setAttribute("aria-expanded", "true");
        window.addEventListener("scroll", positionAddMenu, true);
        window.addEventListener("resize", positionAddMenu);
    }

    if (addButton && addMenu) {
        addButton.addEventListener("click", (event) => {
            event.stopPropagation();
            if (addMenu.classList.contains("is-open")) closeAddMenu();
            else openAddMenu();
        });

        document.addEventListener("pointerdown", (event) => {
            if (!addMenu.contains(event.target) && !addButton.contains(event.target)) closeAddMenu();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeAddMenu();
        });
    }

    if (deepAnalysisToggle) {
        const deepSwitch = deepAnalysisToggle.querySelector(".menu-item-switch");
        deepAnalysisToggle.addEventListener("click", () => {
            const isOn = deepAnalysisToggle.getAttribute("aria-checked") === "true";
            deepAnalysisToggle.setAttribute("aria-checked", String(!isOn));
            deepSwitch.src = isOn ? "assets/menu/toggle-off.svg" : "assets/menu/toggle-on.svg";
        });
    }

    // ── Data-model overlay menu ──
    const modelMenuButton = document.getElementById("model-menu-button");
    const modelMenu = document.getElementById("model-menu");

    if (modelMenu) document.body.appendChild(modelMenu);

    function positionModelMenu() {
        const rect = modelMenuButton.getBoundingClientRect();
        // Right-align to button's right edge; open below button with 8px gap
        modelMenu.style.left = `${rect.right}px`;
        modelMenu.style.top = `${rect.bottom + 8}px`;
    }

    function openModelMenu() {
        positionModelMenu();
        modelMenu.hidden = false;
        requestAnimationFrame(() => {
            modelMenu.classList.add("is-open");
        });
        modelMenuButton.setAttribute("aria-expanded", "true");
        window.addEventListener("scroll", positionModelMenu, true);
        window.addEventListener("resize", positionModelMenu);
    }

    function closeModelMenu() {
        if (!modelMenu || !modelMenu.classList.contains("is-open")) return;
        modelMenu.classList.remove("is-open");
        modelMenuButton.setAttribute("aria-expanded", "false");
        window.removeEventListener("scroll", positionModelMenu, true);
        window.removeEventListener("resize", positionModelMenu);
        modelMenu.addEventListener("transitionend", () => { modelMenu.hidden = true; }, { once: true });
    }

    if (modelMenuButton && modelMenu) {
        modelMenuButton.addEventListener("click", (event) => {
            event.stopPropagation();
            if (modelMenu.classList.contains("is-open")) closeModelMenu();
            else openModelMenu();
        });

        document.addEventListener("pointerdown", (event) => {
            if (!modelMenu.contains(event.target) && !modelMenuButton.contains(event.target)) closeModelMenu();
        });
    }

    // ── Seamless in-page Home ↔ Spotter navigation ───────────────────────────────
    // A full reload re-seeds the radiance background (random per-blob phases) and
    // flashes the page, so switching between Home and the Spotter landing is done
    // in-page: the layout morphs and only the URL changes. The background canvas in
    // #background-root is never unmounted, so it stays perfectly continuous.
    function basePath() {
        return window.location.pathname.replace(/[^/]*$/, "");
    }

    function setNavActiveByLabel(label) {
        navLinks.forEach((l) => l.classList.toggle("is-active", l.textContent.trim() === label));
    }

    // FLIP: animate the prompt module from its current position to wherever the
    // layout change (run inside `mutate`) leaves it, so the move reads as a glide.
    function flipStack(mutate) {
        const stack = document.querySelector(".home-stack");
        if (!stack) { mutate(); return; }
        const first = stack.getBoundingClientRect();
        mutate();
        const last = stack.getBoundingClientRect();
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (!dx && !dy) return;
        stack.style.transition = "none";
        stack.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            stack.style.transition = "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)";
            stack.style.transform = "";
        }));
        stack.addEventListener("transitionend", function done(e) {
            if (e.propertyName !== "transform") return;
            stack.style.transition = "";
            stack.removeEventListener("transitionend", done);
        });
    }

    function goToSpotterLanding(push) {
        if (document.body.classList.contains("spotter-page")) return;
        const panels = document.querySelector(".home-panels");
        if (panels) { panels.style.transition = "opacity 140ms ease"; panels.style.opacity = "0"; }
        window.setTimeout(() => {
            flipStack(() => document.body.classList.add("spotter-page"));
            if (panels) { panels.style.transition = ""; panels.style.opacity = ""; }
            positionDisclaimer();
        }, 140);
        document.title = "Spotter - Radiance";
        setNavActiveByLabel("Spotter");
        if (push !== false) history.pushState({ page: "spotter-landing" }, "", basePath() + "Spotterhome");
    }

    function goToHome(push) {
        if (!document.body.classList.contains("spotter-page")) return;
        const panels = document.querySelector(".home-panels");
        flipStack(() => {
            document.body.classList.remove("spotter-page");
            if (panels) { panels.style.transition = "none"; panels.style.opacity = "0"; }
        });
        if (panels) {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                panels.style.transition = "opacity 280ms ease";
                panels.style.opacity = "";
            }));
        }
        positionDisclaimer();
        document.title = "Home - Radiance";
        setNavActiveByLabel("Home");
        if (push !== false) history.pushState({ page: "home" }, "", basePath() + "Home");
    }

    // Brand logo → go Home. Seamless from the Spotter landing; only reloads when
    // leaving the answer view (where the in-page state can't be rewound).
    const brandButton = document.querySelector(".brand-button[data-href]");
    if (brandButton) {
        brandButton.addEventListener("click", () => {
            if (!transitionFired) {
                if (document.body.classList.contains("spotter-page")) goToHome();
                return;
            }
            window.location.href = brandButton.dataset.href;
        });
    }

    modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
    navLinks.forEach((link) => link.addEventListener("click", () => {
        const label = link.textContent.trim();
        // Home ↔ Spotter: morph in-page instead of reloading (keeps background alive).
        if (link.dataset.href && (label === "Home" || label === "Spotter")) {
            if (transitionFired) { window.location.href = link.dataset.href; return; }
            if (label === "Spotter") goToSpotterLanding();
            else goToHome();
            if (window.matchMedia("(max-width: 860px)").matches) closeSidebar();
            return;
        }
        if (link.dataset.href) {
            window.location.href = link.dataset.href;
            return;
        }
        setActiveNav(link);
    }));

    // Keep layout in sync with the URL on browser back/forward (no reload).
    window.addEventListener("popstate", () => {
        if (transitionFired) return;
        if (/Spotterhome\/?$/i.test(window.location.pathname)) goToSpotterLanding(false);
        else goToHome(false);
    });
    railButtons.forEach((button) => button.addEventListener("click", () => setActiveRail(button)));
    mobileMenuButton.addEventListener("click", () => {
        if (sidebar.classList.contains("is-open")) closeSidebar();
        else openSidebar();
    });
    sidebarBackdrop.addEventListener("click", closeSidebar);
    notificationButton.addEventListener("click", toggleNotifications);
    themeToggle.addEventListener("click", toggleTheme);
    if (addKpiButton) addKpiButton.addEventListener("click", addKpi);
    explorationButton.addEventListener("click", toggleExploration);
    explorationClose.addEventListener("click", closeExploration);
    variationButtons.forEach((button) => button.addEventListener("click", () => setVariation(button)));
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeydown);
    resizeAskInput();

    // ── Starter chip card expansion (shared logic for Quick search & Deep analysis) ──
    const panelsBlur = document.getElementById('panels-blur-overlay');

    function openStarterCard(chip, card, header) {
        // Close any other open card first
        document.querySelectorAll('.qs-card:not([hidden])').forEach(c => {
            if (c !== card) {
                const otherChip = document.querySelector(`[aria-expanded="true"].starter-prompt-chip`);
                if (otherChip) {
                    otherChip.style.opacity = '';
                    otherChip.style.pointerEvents = '';
                    otherChip.setAttribute('aria-expanded', 'false');
                }
                c.classList.remove('is-expanded');
                c.hidden = true;
            }
        });

        const chipRect = chip.getBoundingClientRect();
        const cardRect = promptCard ? promptCard.getBoundingClientRect() : null;
        const expandedWidth = 660;
        const expandedLeft = cardRect
            ? cardRect.left + (cardRect.width - expandedWidth) / 2
            : chipRect.left;

        card.style.left      = `${chipRect.left}px`;
        card.style.top       = `${chipRect.top}px`;
        card.style.width     = `${chipRect.width}px`;
        card.style.maxHeight = `${chipRect.height}px`;
        header.style.height  = `${chipRect.height}px`;

        card.hidden = false;
        chip.style.opacity = '0';
        chip.style.pointerEvents = 'none';
        chip.setAttribute('aria-expanded', 'true');

        if (panelsBlur) {
            const chipsBottom = document.querySelector('.starter-prompts').getBoundingClientRect().bottom;
            const mainLeft = document.querySelector('.home-main')?.getBoundingClientRect().left ?? 0;
            panelsBlur.style.top  = `${chipsBottom}px`;
            panelsBlur.style.left = `${mainLeft}px`;
            panelsBlur.classList.add('is-active');
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                card.classList.add('is-expanded');
                card.style.left      = `${expandedLeft}px`;
                card.style.width     = '660px';
                card.style.maxHeight = '320px';
            });
        });
    }

    function closeStarterCard(chip, card) {
        if (!card || card.hidden) return;
        const chipRect = chip.getBoundingClientRect();
        card.classList.remove('is-expanded');
        card.style.left      = `${chipRect.left}px`;
        card.style.width     = `${chipRect.width}px`;
        card.style.maxHeight = `${chipRect.height}px`;
        chip.setAttribute('aria-expanded', 'false');
        if (panelsBlur) panelsBlur.classList.remove('is-active');

        card.addEventListener('transitionend', () => {
            card.hidden = true;
            chip.style.opacity = '';
            chip.style.pointerEvents = '';
        }, { once: true });
    }

    // Quick search
    const qsChip   = document.getElementById('quick-search-chip');
    const qsCard   = document.getElementById('qs-card');
    const qsHeader = document.getElementById('qs-header');
    const qsClose  = document.getElementById('qs-close');

    if (qsChip && qsCard) {
        qsChip.addEventListener('click', (e) => { e.stopPropagation(); openStarterCard(qsChip, qsCard, qsHeader); });
        qsClose.addEventListener('click', (e) => { e.stopPropagation(); closeStarterCard(qsChip, qsCard); });
    }

    // Deep analysis
    const daChip   = document.getElementById('deep-analysis-chip');
    const daCard   = document.getElementById('da-card');
    const daHeader = document.getElementById('da-header');
    const daClose  = document.getElementById('da-close');

    if (daChip && daCard) {
        daChip.addEventListener('click', (e) => { e.stopPropagation(); openStarterCard(daChip, daCard, daHeader); });
        daClose.addEventListener('click', (e) => { e.stopPropagation(); closeStarterCard(daChip, daCard); });
    }

    // Close on outside click
    document.addEventListener('pointerdown', (e) => {
        if (qsCard && !qsCard.hidden && !qsCard.contains(e.target) && !qsChip.contains(e.target)) closeStarterCard(qsChip, qsCard);
        if (daCard && !daCard.hidden && !daCard.contains(e.target) && !daChip.contains(e.target)) closeStarterCard(daChip, daCard);
    });

    // ── Answer block helpers ──
    function buildChartSVG() {
        const data = [
            { l1: 'Connecticut',   l2: '(06110)', v: 18.98 },
            { l1: 'Connecticut',   l2: '(06854)', v: 22.29 },
            { l1: 'Delaware',      l2: '(19702)', v: 24.78 },
            { l1: 'Maryland',      l2: '(21045)', v: 31.01 },
            { l1: 'Massachusetts', l2: '(01701)', v: 20.65 },
            { l1: 'Massachusetts', l2: '(02215)', v: 32    },
            { l1: 'New Hampshire', l2: '(03860)', v: 42.48 },
            { l1: 'New Jersey',    l2: '(07936)', v: 60.26 },
        ];
        const W=800, H=380, ml=64, mr=24, mt=30, mb=72;
        const cw=W-ml-mr, ch=H-mt-mb, maxV=70, sc=ch/maxV, bY=mt+ch;
        const bw=52, gw=cw/8, bo=(gw-bw)/2;
        let bars='', vals='', xlabs='', grids='', ylabs='';
        data.forEach((d, i) => {
            const x=ml+i*gw+bo, cx=x+bw/2, h=d.v*sc, y=bY-h;
            bars  += `<rect class="chart-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="3"/>`;
            vals  += `<text class="chart-val" x="${cx.toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle">${d.v}M</text>`;
            xlabs += `<text class="chart-lbl" x="${cx.toFixed(1)}" y="${(bY+16).toFixed(1)}" text-anchor="middle">${d.l1}</text>`;
            xlabs += `<text class="chart-lbl" x="${cx.toFixed(1)}" y="${(bY+28).toFixed(1)}" text-anchor="middle">${d.l2}</text>`;
        });
        [0, 20, 40, 60].forEach(v => {
            const gy = bY - v * sc;
            grids += `<line class="chart-grid" x1="${ml}" y1="${gy.toFixed(1)}" x2="${W-mr}" y2="${gy.toFixed(1)}"/>`;
            ylabs += `<text class="chart-lbl" x="${ml-8}" y="${(gy+4).toFixed(1)}" text-anchor="end">${v===0?'0':v+'M'}</text>`;
        });
        return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><style>.chart-grid{stroke:var(--border,#303136);stroke-width:1}.chart-lbl{fill:var(--secondary-text,#8c9196);font-family:inherit;font-size:9.5px}.chart-val{fill:var(--primary-text,#dfe0e2);font-family:inherit;font-size:10px;font-weight:600}.chart-bar{fill:#7B61FF}.chart-bg{fill:var(--base,#1a1b1e)}</style><rect class="chart-bg" x="0" y="0" width="${W}" height="${H}"/>${grids}${ylabs}${bars}${vals}${xlabs}<text class="chart-lbl" transform="translate(10,${(mt+ch/2).toFixed(0)}) rotate(-90)" text-anchor="middle">Total sales ›</text><text class="chart-lbl" x="${(ml+cw/2).toFixed(0)}" y="${H-8}" text-anchor="middle">store ▼</text></svg>`;
    }

    function buildAnswerBlock() {
        const el = document.createElement('div');
        el.className = 'answer-block';
        Object.assign(el.style, { opacity: '0', transition: 'opacity 200ms ease' });
        el.innerHTML = `
<div class="answer-text-group">
  <p class="answer-main-title">Total sales this year (2026)</p>
  <p class="answer-main-subtitle">Sales in the East region are performing well across 8 stores. Here's the breakdown:</p>
</div>
<div class="answer-card">
  <div class="answer-card-body">
    <div class="answer-card-top-row">
      <button class="answer-pill"><span class="answer-pill-key">region</span> <span class="answer-pill-val">east</span></button>
      <div class="answer-card-actions">
        <button class="answer-segment"><div class="answer-seg-thumb"></div><span class="answer-seg-icon answer-seg-icon--left"><svg viewBox="0 0 12 12" fill="currentColor"><rect x="1" y="5" width="2.5" height="5" rx="0.5"/><rect x="4.75" y="3" width="2.5" height="7" rx="0.5"/><rect x="8.5" y="1" width="2.5" height="9" rx="0.5"/></svg></span><span class="answer-seg-icon answer-seg-icon--right"><svg viewBox="0 0 12 12" fill="currentColor"><rect x="1" y="1.5" width="10" height="1.5" rx="0.4"/><rect x="1" y="5" width="4" height="1.5" rx="0.4"/><rect x="7" y="5" width="4" height="1.5" rx="0.4"/><rect x="1" y="8.5" width="4" height="1.5" rx="0.4"/><rect x="7" y="8.5" width="4" height="1.5" rx="0.4"/></svg></span></button>
        <button class="answer-action-btn"><svg viewBox="0 0 14 14" fill="currentColor"><path d="M1 1h4.5v1.5H2.5V5H1V1zm7.5 0H13v4h-1.5V2.5H9V1zM1 9h1.5v2.5H5V13H1V9zm10.5 2.5V9H13v4H9v-1.5h2.5z"/></svg></button>
        <button class="answer-action-btn"><svg viewBox="0 0 14 14" fill="currentColor"><circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="11" cy="7" r="1.2"/></svg></button>
      </div>
    </div>
    <div class="answer-chart-wrap">${buildChartSVG()}</div>
  </div>
  <div class="answer-card-footer">
    <button class="answer-footer-btn"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2L1 6l4 3.5V8c4 0 7 1.5 7 5 0-6-3-8-7-8.5V2z"/></svg>Ask follow-up</button>
    <button class="answer-footer-btn"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M7 9.5V9M7 4.5c0-.8 1-1.5 1.5-1C9 4 9 5 7.5 6 7 6.3 7 6.7 7 7" stroke-linecap="round"/></svg>View explanation</button>
  </div>
</div>
<div class="answer-highlights">
  <p class="answer-highlights-title">Key Highlights:</p>
  <ul class="answer-highlights-list">
    <li>Top Performer: New Jersey (07936) leads with 60.3M in sales</li>
    <li>Strong Performers: New Hampshire (03860) at 42.5M and Massachusetts (02215) at 32M</li>
    <li>Total Stores: 8 locations serving the East region</li>
  </ul>
</div>
<div class="answer-footnote">✅ Sent to you on Slack! Check your direct messages for the full breakdown.</div>
<div class="answer-icon-bar">
  <button class="answer-vote-btn" title="Helpful"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M5 14H3V8h2v6zm2 0h5.5l2-5v-.5H11V5L9.5 2 8 5v3H7v6z"/></svg></button>
  <button class="answer-vote-btn" title="Not helpful"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M11 2h2v6h-2V2zm-2 0H3.5l-2 5v.5H5v3L6.5 14 8 11V8h1V2z"/></svg></button>
  <button class="answer-vote-btn" title="Copy"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M2 11V2h9" stroke-linecap="round"/></svg></button>
  <button class="answer-vote-btn" title="Fact check"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="1,9 5,13 10,4"/><polyline points="6,9 10,13 15,4"/></svg></button>
</div>`;
        return el;
    }

    // ── Spotter send transition ──
    let inputLocked = true;   // keeps the canned query locked until /spotterhome loads
    let typewriterStarted = false;
    let typewriterDone = false;
    let transitionFired = false;
    function runSpotterTransition() {
        if (transitionFired) return;
        transitionFired = true;
        const queryText = askInput ? askInput.value.trim() : '';
        const DURATION = 450;
        const easing = `${DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`; // ease-out

        // Close any open starter cards
        if (qsCard && !qsCard.hidden) closeStarterCard(qsChip, qsCard);
        if (daCard && !daCard.hidden) closeStarterCard(daChip, daCard);
        if (panelsBlur) panelsBlur.classList.remove('is-active');

        const homeStack  = document.querySelector('.home-stack');
        const homePanels = document.querySelector('.home-panels');
        const discEl     = document.querySelector('.disclaimer-bar');

        // Measure everything before any DOM changes
        const stackRect  = homeStack ? homeStack.getBoundingClientRect() : null;
        const formRect   = askForm.getBoundingClientRect();
        const discRect   = discEl ? discEl.getBoundingClientRect() : null;

        // Vertical target: form bottom 8px above disclaimer
        const discH        = discRect ? discRect.height : 24;
        const discOffset   = discRect ? (window.innerHeight - discRect.bottom) : 4;
        const targetBottom = window.innerHeight - discH - discOffset - 8;
        const targetTop    = targetBottom - formRect.height;
        const deltaY       = targetTop - formRect.top;

        // No horizontal movement — straight down only
        const deltaX = 0;

        // 1. Home sidebar slides off-screen left; spotter nav pushes in from left
        const spotterNav = document.getElementById('spotter-nav');
        sidebar.style.transition = `transform ${easing}`;
        sidebar.style.transform  = 'translateX(-100%)';
        if (spotterNav) {
            spotterNav.removeAttribute('aria-hidden');
            spotterNav.style.transition = `transform ${easing}`;
            spotterNav.style.transform  = 'translateX(0)';
        }

        // 2. Panels vanish instantly
        if (homePanels) {
            homePanels.style.opacity       = '0';
            homePanels.style.pointerEvents = 'none';
        }

        // Disclaimer stays visible throughout

        // 4. Pin the whole home-stack to fixed so form + title + chips move together
        if (homeStack && stackRect) {
            homeStack.style.position = 'fixed';
            homeStack.style.left     = `${stackRect.left}px`;
            homeStack.style.top      = `${stackRect.top}px`;
            homeStack.style.width    = `${stackRect.width}px`;
            homeStack.style.margin   = '0';
            homeStack.style.zIndex   = '200';
        }

        // 5. URL changes immediately to reflect the destination
        history.pushState({ page: 'spotter' }, '', BASE_PATH + 'Spotterhome');

        // 6. Animate in next rAF so pinned positions are painted first
        requestAnimationFrame(() => requestAnimationFrame(() => {
            // Diagonal slide: move down + horizontally center in full viewport
            if (homeStack) {
                homeStack.style.transition = `transform ${easing}`;
                homeStack.style.transform  = `translate(${deltaX}px, ${deltaY}px)`;
            }

            // Title and chips fade out quickly (150ms)
            const spotterCopy    = homeStack ? homeStack.querySelector('.spotter-copy') : null;
            const starterPrompts = homeStack ? homeStack.querySelector('.starter-prompts') : null;
            [spotterCopy, starterPrompts].forEach(el => {
                if (!el) return;
                el.style.transition = 'opacity 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                el.style.opacity    = '0';
            });
        }));

        // 7. After animation completes
        setTimeout(() => {
            if (homePanels) homePanels.remove();

            // Reset prompt box for /spotterhome
            inputLocked = false;
            if (askInput) {
                askInput.value = '';
                askInput.placeholder = "Press '/' for skills and '@' to add context";
                resizeAskInput();
                askInput.blur();
            }

            // Hide home sidebar; lock spotter nav in place (no transition needed)
            sidebar.style.display = 'none';
            if (spotterNav) spotterNav.style.transition = 'none';
            const homeMain = document.querySelector('.home-main');
            if (homeMain) homeMain.style.gridColumn = '1 / -1';

            document.title = 'Spotter - Radiance';

            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('is-active'));
            const spotterLink = Array.from(document.querySelectorAll('.nav-link'))
                .find(l => l.textContent.trim() === 'Spotter');
            if (spotterLink) spotterLink.classList.add('is-active');

            // 250ms after prompt box lands: answer title bar slides in
            setTimeout(() => {
                positionDisclaimer();

                const answerBar = document.getElementById('answer-title-bar');
                const titleEl   = document.getElementById('answer-title-text');

                if (answerBar) {
                    answerBar.removeAttribute('aria-hidden');
                    answerBar.style.transition = 'transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    answerBar.style.transform  = 'translateY(0)';
                }

                // +250ms: bar settled → question bubble springs in
                setTimeout(() => {
                    if (answerBar) answerBar.style.transition = 'none';

                    const promptBarEl = document.querySelector('.prompt-bar');
                    const answerBarEl = document.getElementById('answer-title-bar');
                    let bubble = null;
                    let scrollEl = null;

                    if (promptBarEl) {
                        const pRect       = promptBarEl.getBoundingClientRect();
                        const barBottom   = answerBarEl ? answerBarEl.getBoundingClientRect().bottom : 116;
                        const rightOffset = Math.round(window.innerWidth - formRect.right);

                        // Scroll container holds bubble + reasoning + answer
                        scrollEl = document.createElement('div');
                        scrollEl.className = 'conversation-scroll';
                        Object.assign(scrollEl.style, {
                            position:      'fixed',
                            top:           `${barBottom}px`,
                            left:          '0',
                            right:         '0',
                            bottom:        `${window.innerHeight - pRect.top + 12}px`,
                            overflowY:     'auto',
                            overflowX:     'hidden',
                            zIndex:        '100',
                            boxSizing:     'border-box',
                            paddingTop:    '24px',
                            paddingBottom: '0',
                            paddingLeft:   `${formRect.left}px`,
                            paddingRight:  `${rightOffset}px`,
                        });
                        document.body.appendChild(scrollEl);

                        const questionRow = document.createElement('div');
                        questionRow.className = 'question-row';

                        bubble = document.createElement('div');
                        bubble.className = 'question-bubble';
                        bubble.textContent = queryText;
                        Object.assign(bubble.style, {
                            background:     'var(--on-base)',
                            color:          'var(--primary-text)',
                            borderRadius:   '16px 16px 4px 16px',
                            padding:        '12px 16px',
                            fontSize:       '16px',
                            fontWeight:     '375',
                            lineHeight:     '24px',
                            letterSpacing:  '-0.004em',
                            fontFamily:     'inherit',
                            boxSizing:      'border-box',
                            wordBreak:      'break-word',
                            maxWidth:       '100%',
                            opacity:        '0',
                            transform:      'scale(0.85)',
                            transformOrigin:'top right',
                        });
                        questionRow.appendChild(bubble);
                        scrollEl.appendChild(questionRow);

                        requestAnimationFrame(() => requestAnimationFrame(() => {
                            bubble.style.transition = [
                                'opacity 100ms ease-out',
                                'transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                            ].join(', ');
                            bubble.style.opacity   = '1';
                            bubble.style.transform = 'scale(1)';
                        }));
                    }

                    // +250ms after question appears: typewriter + loader
                    setTimeout(() => {
                        if (titleEl && queryText) {
                            const chars    = queryText.split('');
                            const interval = 150 / chars.length;
                            let i = 0;
                            titleEl.textContent = '';
                            const navItem = document.getElementById('nav-first-chat');
                            if (navItem) navItem.textContent = '';
                            const tw = setInterval(() => {
                                titleEl.textContent += chars[i];
                                if (navItem) navItem.textContent += chars[i];
                                i++;
                                if (i >= chars.length) clearInterval(tw);
                            }, interval);
                        }

                        if (bubble) {
                            const bRect = bubble.getBoundingClientRect();
                            const loader = document.createElement('div');
                            loader.className = 'answer-loader';
                            loader.innerHTML = '<div class="answer-loader-dot"></div><div class="answer-loader-dot"></div><div class="answer-loader-dot"></div>';
                            Object.assign(loader.style, {
                                position: 'fixed',
                                top:      `${bRect.bottom + 36}px`,
                                left:     `${formRect.left}px`,
                                zIndex:   '150',
                            });
                            document.querySelectorAll('.answer-loader').forEach(el => el.remove());
                            loader.classList.add('answer-loader--running');
                            document.body.appendChild(loader);

                            setTimeout(() => {
                                document.querySelectorAll('.answer-loader').forEach(el => el.remove());

                                const promptBarEl2   = document.querySelector('.prompt-bar');
                                const pRect2         = promptBarEl2 ? promptBarEl2.getBoundingClientRect() : null;
                                const reasoningWidth = pRect2 ? Math.round(pRect2.width * 0.85) : 520;

                                const block = document.createElement('div');
                                block.className = 'reasoning-block';
                                Object.assign(block.style, {
                                    width:      `${reasoningWidth}px`,
                                    marginTop:  '36px',
                                    opacity:    '0',
                                    transition: 'opacity 200ms ease',
                                });
                                block.innerHTML = `
                                    <div class="reasoning-block-header">
                                        <span class="reasoning-working-text">Working</span>
                                        <span class="reasoning-header-chevron"></span>
                                    </div>
                                    <div class="reasoning-block-body"></div>
                                `;
                                if (scrollEl) scrollEl.appendChild(block);
                                else document.body.appendChild(block);

                                requestAnimationFrame(() => requestAnimationFrame(() => {
                                    block.style.opacity = '1';
                                }));

                                const body = block.querySelector('.reasoning-block-body');

                                const ITEMS = [
                                    { type: 'para',   icon: 'assets/reasoning/spotter-dot.svg', text: 'Let me gather the necessary information to analyze sales performance in the East region with a store breakdown.' },
                                    { type: 'action', icon: 'assets/reasoning/search-m.svg',    label: 'Fetching relevant semantic context' },
                                    { type: 'action', icon: 'assets/reasoning/memory-l.svg',    label: 'Fetching memory' },
                                    { type: 'para',   icon: 'assets/reasoning/spotter-dot.svg', text: 'I have the dataset context. Now let me fetch the sales data for the East region broken down by store, and find your Slack user ID so I can send you the results.' },
                                    { type: 'action', icon: 'assets/reasoning/slack-icon.png',  label: 'Slack: Read user profile' },
                                    { type: 'action', icon: 'assets/reasoning/answer-s.svg',    label: 'Visualizing data' },
                                    { type: 'para',   icon: 'assets/reasoning/spotter-dot.svg', text: 'Done' },
                                ];

                                let prevRow = null;

                                function addRow(idx) {
                                    if (prevRow) {
                                        const iconCol = prevRow.querySelector('.reasoning-row-icon-col');
                                        const connector = document.createElement('div');
                                        connector.className = 'reasoning-connector';
                                        iconCol.appendChild(connector);
                                    }
                                    const item = ITEMS[idx];
                                    const row = document.createElement('div');
                                    row.className = 'reasoning-row';
                                    if (item.type === 'para') {
                                        row.innerHTML = `
                                            <div class="reasoning-row-icon-col">
                                                <div class="reasoning-row-icon reasoning-row-icon--full">
                                                    <img src="${item.icon}" alt="">
                                                </div>
                                            </div>
                                            <div class="reasoning-row-text">
                                                <span class="reasoning-row-para">${item.text}</span>
                                            </div>
                                        `;
                                    } else {
                                        row.innerHTML = `
                                            <div class="reasoning-row-icon-col">
                                                <div class="reasoning-row-icon reasoning-row-icon--sm">
                                                    <img src="${item.icon}" alt="">
                                                </div>
                                            </div>
                                            <div class="reasoning-row-text">
                                                <span class="reasoning-row-label">${item.label}</span>
                                                <img src="assets/reasoning/chevron-down.svg" class="reasoning-chevron" alt="">
                                            </div>
                                        `;
                                    }
                                    body.appendChild(row);
                                    prevRow = row;
                                    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
                                }

                                addRow(0);

                                const delays = [];
                                let rem = 8000;
                                for (let i = 0; i < 5; i++) {
                                    const minHere = 800;
                                    const minRest = (4 - i) * 800;
                                    const maxHere = rem - minRest;
                                    const t = Math.floor(Math.random() * (maxHere - minHere)) + minHere;
                                    delays.push(t);
                                    rem -= t;
                                }

                                let cumDelay = 0;
                                for (let i = 1; i <= 5; i++) {
                                    cumDelay += delays[i - 1];
                                    (function(rowIdx, delay) {
                                        setTimeout(() => addRow(rowIdx), delay);
                                    })(i, cumDelay);
                                }

                                const doneDelay = cumDelay + 350;
                                setTimeout(() => {
                                    addRow(6);
                                }, doneDelay);

                                setTimeout(() => {
                                    const header = block.querySelector('.reasoning-block-header');
                                    const workingText = block.querySelector('.reasoning-working-text');
                                    if (header) header.classList.add('is-done');
                                    if (workingText) workingText.textContent = 'Show work';

                                    if (scrollEl) {
                                        const answerEl = buildAnswerBlock();
                                        scrollEl.appendChild(answerEl);
                                        requestAnimationFrame(() => requestAnimationFrame(() => {
                                            answerEl.style.opacity = '1';
                                            const sRect = scrollEl.getBoundingClientRect();
                                            const aRect = answerEl.getBoundingClientRect();
                                            const targetScrollTop = (aRect.top - sRect.top + scrollEl.scrollTop) - 24;
                                            const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
                                            if (targetScrollTop > maxScroll) {
                                                answerEl.style.paddingBottom = `${targetScrollTop - maxScroll}px`;
                                            }
                                            const startTop = scrollEl.scrollTop;
                                            const delta = targetScrollTop - startTop;
                                            const duration = 480;
                                            let startTime = null;
                                            function easeOutQuad(t) { return t * (2 - t); }
                                            function animateScroll(ts) {
                                                if (!startTime) startTime = ts;
                                                const elapsed = Math.min((ts - startTime) / duration, 1);
                                                scrollEl.scrollTop = startTop + delta * easeOutQuad(elapsed);
                                                if (elapsed < 1) {
                                                    requestAnimationFrame(animateScroll);
                                                } else if (askInput) {
                                                    askInput.focus({ preventScroll: true });
                                                }
                                            }
                                            requestAnimationFrame(animateScroll);
                                        }));
                                    }
                                }, doneDelay + 100);
                            }, 3250);
                        }
                    }, 250);
                }, 250);
            }, 250);
        }, DURATION);
    }

    // Align disclaimer to the prompt box
    const disclaimerBar = document.querySelector('.disclaimer-bar');
    const promptCard = document.querySelector('.prompt-bar-card');

    function positionDisclaimer() {
        if (!disclaimerBar || !promptCard) return;
        const r = promptCard.getBoundingClientRect();
        disclaimerBar.style.left = `${r.left}px`;
        disclaimerBar.style.width = `${r.width}px`;
    }

    positionDisclaimer();
    window.addEventListener('resize', positionDisclaimer);
})();
