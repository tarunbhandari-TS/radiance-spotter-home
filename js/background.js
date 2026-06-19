(() => {
    const DEFAULT_VARIATION = "top-wash";
    let activeVariation = DEFAULT_VARIATION;
    let queryFocusTimer = 0;
    let queryMotionTimer = 0;
    let currentDriverName = null;
    let mountRoot = null;

    const radianceVariations = {
        "top-wash": {
            variant: "dynamic-subtle",
            intensity: "subtle",
            darkGlow: "subtle",
            layout: "top-wash",
            speed: { light: "1.86", dark: "1.72" }
        },
        "top-focus": {
            variant: "dynamic-subtle",
            intensity: "subtle",
            darkGlow: "subtle",
            layout: "top-wash",
            speed: { light: "1.86", dark: "1.72" }
        },
        next: {
            variant: "dynamic-subtle",
            intensity: "subtle",
            darkGlow: "subtle",
            layout: "neutral",
            speed: { light: "1.38", dark: "1.24" }
        },
        "focus-aura": {
            variant: "dynamic-subtle",
            intensity: "subtle",
            darkGlow: "subtle",
            layout: "neutral",
            speed: { light: "0.86", dark: "0.86" }
        }
    };

    const focusAuraLocalVariation = {
        variant: "dynamic-prominent",
        intensity: "prominent",
        darkGlow: "prominent",
        layout: "neutral",
        speed: { light: "1.15", dark: "1.05" }
    };

    const topFocusLocalVariation = {
        variant: "dynamic-prominent",
        intensity: "prominent",
        darkGlow: "prominent",
        layout: "top-wash",
        speed: { light: "1.72", dark: "1.58" }
    };

    const drivers = {};

    function registerDriver(name, driver) {
        drivers[name] = driver;
    }

    function isFocusVariation(variationName) {
        const name = variationName !== undefined ? variationName : activeVariation;
        return name === "focus-aura" || name === "top-focus";
    }

    function getVisualVariation(variationName) {
        const name = variationName !== undefined ? variationName : activeVariation;
        return name === "top-focus" ? "top-wash" : name;
    }

    function applyRadianceVariation() {
        const surfaces = Array.from(document.querySelectorAll(".radiance-local"));
        if (!surfaces.length) return;
        const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
        const variation = radianceVariations[activeVariation] || radianceVariations[DEFAULT_VARIATION];

        surfaces.forEach((surface) => {
            const isFocusLocal = isFocusVariation() && (
                surface.closest(".query-radiance") || surface.closest(".focus-flow")
            );
            const surfaceVariation = isFocusLocal
                ? (activeVariation === "top-focus" ? topFocusLocalVariation : focusAuraLocalVariation)
                : variation;

            surface.dataset.radianceAppearance = theme;
            surface.dataset.radianceVariant = surfaceVariation.variant;
            surface.dataset.radianceIntensity = surfaceVariation.intensity;
            surface.dataset.radianceDarkGlow = surfaceVariation.darkGlow;
            surface.dataset.radianceLayout = surfaceVariation.layout;
            surface.dataset.radianceSpeed = surfaceVariation.speed[theme] || surfaceVariation.speed.light || "1";
            delete surface.dataset.radianceMotion;
        });

        window.RadianceLanguageRenderer?.refresh?.();
    }

    function setQueryFocus(isFocused, forceMotion) {
        const force = forceMotion === true;
        const root = document.documentElement;
        const nextFocus = isFocused ? "true" : "false";
        if (root.dataset.queryFocus === nextFocus && !force) return;

        window.clearTimeout(queryMotionTimer);
        root.dataset.queryFocus = nextFocus;
        root.dataset.queryMotion = isFocused ? "entering" : "leaving";

        const motionDuration = activeVariation === "top-focus"
            ? (isFocused ? 780 : 840)
            : (isFocused ? 700 : 760);

        queryMotionTimer = window.setTimeout(() => {
            root.dataset.queryMotion = root.dataset.queryFocus === "true" ? "settled" : "idle";
        }, motionDuration);
    }

    function applyVariation(variationName) {
        activeVariation = radianceVariations[variationName] ? variationName : DEFAULT_VARIATION;
        document.documentElement.dataset.homeVariation = getVisualVariation();
        document.documentElement.dataset.selectedVariation = activeVariation;
        document.documentElement.dataset.queryEffect = activeVariation === "top-focus"
            ? "top-focus"
            : (activeVariation === "focus-aura" ? "focus-aura" : "none");
        applyRadianceVariation();
    }

    function setTheme() {
        applyRadianceVariation();
    }

    // ── Radiance driver ──────────────────────────────────────────────────────────

    registerDriver("radiance", {
        mount(root) {
            root.innerHTML = [
                '<div class="home-radiance" aria-hidden="true">',
                '    <div class="radiance-local"></div>',
                '</div>',
                '<div class="focus-flow" aria-hidden="true">',
                '    <div class="radiance-local"></div>',
                '</div>'
            ].join("\n");
        },
        unmount(root) {
            root.innerHTML = "";
        }
    });

    // ── Public API ───────────────────────────────────────────────────────────────

    function use(driverName) {
        if (!drivers[driverName]) {
            console.warn(`Background: unknown driver "${driverName}"`);
            return;
        }
        if (currentDriverName && drivers[currentDriverName]?.unmount) {
            drivers[currentDriverName].unmount(mountRoot);
        }
        currentDriverName = driverName;
        drivers[driverName].mount(mountRoot, activeVariation);
        applyRadianceVariation();
    }

    window.Background = {
        use,
        registerDriver,
        applyVariation,
        setTheme,
        setQueryFocus,
        isFocusVariation,
        get activeVariation() { return activeVariation; }
    };

    // ── Init ─────────────────────────────────────────────────────────────────────

    function init() {
        mountRoot = document.getElementById("background-root");
        if (!mountRoot) return;

        document.documentElement.dataset.homeVariation = DEFAULT_VARIATION;
        document.documentElement.dataset.selectedVariation = DEFAULT_VARIATION;
        document.documentElement.dataset.queryEffect = "none";
        document.documentElement.dataset.queryFocus = "false";
        document.documentElement.dataset.queryMotion = "idle";

        use("radiance");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Expose focus timer cleanup for app.js
    window.Background._clearFocusTimer = () => window.clearTimeout(queryFocusTimer);
    window.Background._setFocusTimer = (fn) => {
        window.clearTimeout(queryFocusTimer);
        queryFocusTimer = window.setTimeout(fn, 0);
    };
})();
