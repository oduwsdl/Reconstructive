class ReconstructiveBanner extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'closed'});
  }

  connectedCallback() {
    this.urir = this.getAttribute('urir');
    this.datetime = this.getAttribute('datetime');
    console.log(this.urir);
    let template = `
      <style>
        div#reconstructive-banner-aligner {
          width: 100%;
          position: fixed;
          bottom: 0;
        }
        div.hidden {
          display: none;
        }
        div#reconstructive-banner-container {
          max-width: 500px;
          height: 60px;
          border: 2px solid #FF8B00;
          background-color: #F2FFE3;
          border-radius: 5px;
          color: #1B4869;
          margin: 10px auto;
          padding: 5px;
          display: grid;
          grid-gap: 5px;
          box-shadow: 0 0 10px;
        }
        input {
          padding: 3px;
          box-sizing:border-box;
        }
        input.urir {
          grid-column: 1 / 3;
          grid-row: 1;
        }
        p.label {
          grid-column: 1;
          grid-row: 2;
          margin: 0;
        }
        input.datetime {
          grid-column: 2;
          grid-row: 2;
        }
      </style>
      <div id="reconstructive-banner-aligner" class="">
        <div id="reconstructive-banner-container">
          <input class="urir" value="${this.urir}">
          <p class="label">Archived at:</p>
          <input class="datetime" value="${this.datetime}">
        </div>
      </div>
    `;
    this.shadow.innerHTML = template;

    let aligner = this.shadow.getElementById('reconstructive-banner-aligner');
    let t;
    let resetTimer = () => {
      aligner.classList.remove('hidden');
      clearTimeout(t);
      t = setTimeout(() => aligner.classList.add('hidden'), 3000);
    }
    window.onload = resetTimer;
    window.onmousemove = resetTimer;
    window.onmousedown = resetTimer;
    window.onclick = resetTimer;
    window.onscroll = resetTimer;
    window.onkeypress = resetTimer;
  }
}

customElements.define('reconstructive-banner', ReconstructiveBanner);