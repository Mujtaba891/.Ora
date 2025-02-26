async function openOraFile(fileHandle) {
    const file = await fileHandle.getFile();
    const content = await file.text();
    console.log("Opened ORA File: ", file.name);
    document.getElementById("editor").textContent = content; // Update editor content
}

// Check if a file is opened and redirect to editor.html
const params = new URLSearchParams(window.location.search);
const fileName = params.get("file");

// Redirect to editor.html only if not already there
if (fileName && !window.location.pathname.includes("editor.html")) {
    window.location.href = `/editor.html?file=${encodeURIComponent(fileName)}`;
}


async function loadFileFromParams() {
    const params = new URLSearchParams(window.location.search);
    const fileName = params.get("file");

    if (!fileName) return;

    try {
        const fileHandle = await window.showOpenFilePicker({
            types: [{ description: "Ora Files", accept: { "application/ora": [".Ora"] } }]
        });

        const file = await fileHandle[0].getFile();
        const content = await file.text();

        document.getElementById("editor").textContent = content; // Show content in editor
    } catch (error) {
        console.error("File loading error:", error);
    }
}

window.onload = loadFileFromParams;
