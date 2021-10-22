async function timeoutAsync(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function getBreakPointsAsync(delta = 0, delay = 0) {
    const breakPoints = [];
    const leafletSections = document.querySelectorAll('leaflet-section');
    await timeoutAsync(delay);

    for (const section of leafletSections) {
        breakPoints.push(section.offsetTop - delta);
    }

    for (const breakPoint of breakPoints) {
        if (breakPoint > 0) {
            breakPoints.push(Infinity);
            return breakPoints;
        }
    }

    await timeoutAsync(5);
    return await getBreakPointsAsync(delta);
}

export default class LeafletShortcuts extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.backButton = document.createElement('ion-button');
        this.backButton.part = 'scroll-top';
        this.backButton.innerText = this.getAttribute('button');
        this.backButton.strong = true;
        this.backButton.shape = 'round';

        this.shadowRoot.innerHTML = `
            <style>
                ::-webkit-scrollbar {  width: 2px; height: 2px }
                ::-webkit-scrollbar-button { width: 0; height: 0 }
                ::-webkit-scrollbar-thumb {
                    background: var(--scrollbar-color);
                    border: none; border-radius: 50px;
                }
                ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-color) }
                ::-webkit-scrollbar-thumb:active { background: var(--scrollbar-color) }
                ::-webkit-scrollbar-track {
                    background: var(--scrollbar-background);
                    border: none; border-radius: 0;
                }
                ::-webkit-scrollbar-track:hover { background: var(--scrollbar-background) }
                ::-webkit-scrollbar-track:active { background: var(--scrollbar-background) }
                ::-webkit-scrollbar-corner { background: transparent }
            </style>
            <div part="container">
                <slot></slot>
            </div>
        `;
    }

    async attachScrollListeners(selector = ':root') {
        const pageTemplate = document.querySelector(`${selector}`);
        await pageTemplate.componentOnReady();

        const leafletButtons = pageTemplate.querySelectorAll('leaflet-button');
        const leafletSections = pageTemplate.querySelectorAll('leaflet-section');
        const leafletHeader = pageTemplate.querySelector('#leaflet-header');

        this.tags = Array.from(leafletButtons).map(button => button.getAttribute('tag'));

        const ionContent = pageTemplate.shadowRoot.querySelector('ion-content');
        await ionContent.componentOnReady();
        const scrollElement = await ionContent.getScrollElement();
        ionContent.scrollEvents = true;
        // ionContent.scrollY = true;
        // ionContent.forceOverscroll = true;

        const style = window.getComputedStyle(this);
        const normalDelta = Number.parseInt(style.getPropertyValue('--delta-normal'));
        const collapseDelta =  Number.parseInt(style.getPropertyValue('--delta-collapse'));

        let lastTag = undefined;
        let ticking = false;
        let delta = normalDelta;

        let scrollOrigin = 'scroll'; // or 'button';
        let buttonTarget = undefined;

        this.breakPoints = await getBreakPointsAsync(delta);

        leafletButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const tag = button.getAttribute('tag');
                const section = pageTemplate.querySelector(`leaflet-section[ref="${tag}"]`);

                scrollOrigin = 'button';
                buttonTarget = tag;

                this.breakPoints = await getBreakPointsAsync(delta, 0);

                // If there is no more space for scrolling, open section first, then try to scroll to actual accordion
                if (scrollElement.scrollHeight === scrollElement.offsetHeight) {
                    await section.open();
                }

                await ionContent.scrollToPoint(undefined, this.breakPoints[this.tags.indexOf(tag)], 200);

                // Otherwise, wait for scrolling efect, then open de accordion
                await timeoutAsync(175);
                await section.open();
                await this.headerSelectorHandler(tag, leafletButtons);
            });
        });

        leafletSections.forEach(accordion => {
            accordion.addEventListener('click', async () => {
                this.breakPoints = await getBreakPointsAsync(delta, 300);
            });
        });

        ionContent.addEventListener('ionScroll', async (e) => {
            if (!ticking) {
                window.requestAnimationFrame(async () => {
                    const { scrollTop } = e.detail;
                    let tag;

                    if (scrollTop > 0) {
                        leafletHeader.setAttribute('effect', 'collapse');
                        leafletButtons.forEach(button => button.setScrollAppearance());
                        delta = collapseDelta;
                        if (!this.backButton.isConnected) {
                            this.shadowRoot.append(this.backButton);
                            this.backButton.addEventListener('click', async () => {
                                await ionContent.scrollToTop();
                            });
                        }
                    } else {
                        leafletHeader.removeAttribute('effect');
                        leafletButtons.forEach(button => button.setInitialAppearance());
                        delta = normalDelta;
                        this.backButton.remove();
                    }

                    for (let i = 0; i < this.breakPoints.length - 1; i++) {
                        if (this.breakPoints[i] <= scrollTop && scrollTop < this.breakPoints[i + 1]) {
                            tag = this.tags[i];
                            break;
                        }
                    }

                    if (lastTag !== tag) {
                        lastTag = tag;

                        if (scrollOrigin === 'button') {
                            if (tag === buttonTarget) {
                                await this.headerSelectorHandler(tag, leafletButtons);
                                scrollOrigin = 'scroll';
                            }
                        } else {
                            await this.headerSelectorHandler(tag, leafletButtons);
                        }
                    }

                    ticking = false;
                });

                ticking = true;
            }
        });
    }

    async headerSelectorHandler(tag, leafletButtons) {
        let activeButton;

        leafletButtons.forEach(button => {
            if (button.getAttribute('tag') === tag) {
                button.setAttribute('active', '');
                activeButton = button;
            } else {
                button.removeAttribute('active');
            }
        });

        if (activeButton) {
            const container = this.shadowRoot.querySelector('[part="container"]');
            container.scrollLeft = activeButton.offsetLeft - 16;
        }
    }
}

