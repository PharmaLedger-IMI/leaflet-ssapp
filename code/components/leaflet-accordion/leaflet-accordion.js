const TRANSITION_DELAY = 300;

async function timeoutAsync(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export default class LeafletAccordion extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        const description = this.getAttribute('description');

        this.shadowRoot.innerHTML = `
            <ion-item part="header" button detail="false">
                <div part="container">
                    <div part="label">${this.getAttribute('label' || '')}</div>
                    ${description ? `<div part="description">${this.getAttribute('description')}</div>` : ''}
                </div>
                <div part="toggle horizntal-line"></div>
                <div part="toggle vertical-line"></div>
            </ion-item>
            <div part="content">
                <slot></slot>
            </div>
        `;

        const ionItem = this.shadowRoot.querySelector('ion-item');
        ionItem.addEventListener('click', () => this.toggle());
    }

    async open() {
        this.setAttribute('active', '');
        await timeoutAsync(TRANSITION_DELAY);
    }

    async close() {
        this.removeAttribute('active');
        await timeoutAsync(TRANSITION_DELAY);
    }

    async toggle() {
        this.toggleAttribute('active');
        await timeoutAsync(TRANSITION_DELAY);
    }
}