export default class LeafletButton extends HTMLElement {
    constructor() {
        super();

        this.appearance = 'initial';
        this.iconSrc = undefined;
    }

    static get observedAttributes() {
        return ['active'];
    }

    connectedCallback() {
        const label = this.getAttribute('label');

        this.innerHTML = `
            <ion-item button detail="false">
                <div class="container">
                    <img class="icon" src="${this.getAttribute('icon')}" alt="${label}">
                    <strong class="label">${label}</strong>
                </div>
            </ion-item>
        `;
        this.icon = this.querySelector('img');
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'active':
                if (this.appearance === 'scroll') {
                    this.icon.src = newValue === ''
                        ? this.iconSrc
                        : `${this.iconSrc.slice(0, -`circle.svg`.length)}transparent.svg`;
                    return;
                }

        }
    }

    async setScrollAppearance() {
        if (this.appearance === 'scroll') {
            return;
        }

        if (!this.iconSrc) {
            this.iconSrc = this.icon.src;
        }
        this.icon.src = `${this.iconSrc.slice(0, -`circle.svg`.length)}transparent.svg`;
        this.appearance = 'scroll';
    }

    async setInitialAppearance() {
        if (this.appearance === 'initial') {
            return;
        }

        this.icon.src = this.iconSrc;
        this.appearance = 'initial';
    }
}