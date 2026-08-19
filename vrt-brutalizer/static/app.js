let currentSentence = 0;
let sentenceCount = 0;


const fileInput = document.getElementById("file-input");
const uploadButton = document.getElementById("upload-button");
const exportButton = document.getElementById("export-button");

const previousButton =
    document.getElementById("previous-button");

const nextButton =
    document.getElementById("next-button");

const sentenceContainer =
    document.getElementById("sentence-container");

const sentenceNumber =
    document.getElementById("sentence-number");

const sentenceProgress =
    document.getElementById("sentence-progress");

const fileName =
    document.getElementById("file-name");

const status =
    document.getElementById("status");


uploadButton.addEventListener("click", async () => {

    const file = fileInput.files[0];

    if (!file) {
        setStatus("Please select a VRT file.");
        return;
    }

    const formData = new FormData();

    formData.append("file", file);

    setStatus("Loading corpus...");

    try {

        const response = await fetch(
            "/api/upload",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        sentenceCount = data.sentence_count;
        currentSentence = 0;

        fileName.textContent = data.filename;

        exportButton.disabled = false;

        await loadSentence();

        setStatus("Corpus loaded.");

    } catch (error) {

        setStatus(
            `Error: ${error.message}`
        );

    }
});


async function loadSentence() {

    if (sentenceCount === 0) {
        sentenceContainer.innerHTML = `
            <div class="empty-state">
                No sentences found.
            </div>
        `;

        return;
    }

    const response = await fetch(
        `/api/sentence/${currentSentence}`
    );

    const sentence = await response.json();

    renderSentence(sentence);

    updateNavigation();
}


function renderSentence(sentence) {

    sentenceContainer.innerHTML = "";

    const wrapper =
        document.createElement("div");

    wrapper.className = "sentence";


    const tokenRow =
        document.createElement("div");

    tokenRow.className = "token-row";


    sentence.tokens.forEach(
        (token, tokenIndex) => {

            const tokenElement =
                createTokenElement(
                    token,
                    tokenIndex
                );

            tokenRow.appendChild(tokenElement);
        }
    );


    wrapper.appendChild(tokenRow);

    sentenceContainer.appendChild(wrapper);
}


function createTokenElement(token, tokenIndex) {

    const element =
        document.createElement("div");

    element.className = "token";


    const word =
        document.createElement("div");

    word.className = "token-word";

    word.textContent = token.word;

    element.appendChild(word);


    const fields = [
        ["pos", "Part of Speech"],
        ["morf", "Morphological Segmentation"],
        ["glossing", "Gloss"],
        ["lemma", "Lemma"],
        ["es", "Spanish"],
        ["en", "English"]
    ];


    fields.forEach(
        ([fieldName, label]) => {

            const wrapper =
                document.createElement("div");

            wrapper.className = "field";


            const labelElement =
                document.createElement("label");

            labelElement.textContent = label;


            const input =
                document.createElement("input");

            input.value =
                token[fieldName];


            input.dataset.field =
                fieldName;

            input.dataset.token =
                tokenIndex;


            wrapper.appendChild(labelElement);
            wrapper.appendChild(input);

            element.appendChild(wrapper);
        }
    );


    return element;
}


function updateNavigation() {

    sentenceNumber.textContent =
        `Sentence ${currentSentence + 1}`;

    sentenceProgress.textContent =
        `${currentSentence + 1} / ${sentenceCount}`;

    previousButton.disabled =
        currentSentence === 0;

    nextButton.disabled =
        currentSentence >= sentenceCount - 1;
}


previousButton.addEventListener(
    "click",
    async () => {

        if (currentSentence > 0) {

            currentSentence--;

            await loadSentence();
        }
    }
);


nextButton.addEventListener(
    "click",
    async () => {

        if (currentSentence < sentenceCount - 1) {

            currentSentence++;

            await loadSentence();
        }
    }
);


function setStatus(message) {

    status.textContent = message;
}