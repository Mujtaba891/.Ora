// Open .Ora File function
function openOraFile() {
    const fileInput = document.getElementById("fileInput");
    fileInput.click();
}

// Event listener for the button
document.getElementById("openOraFileButton").addEventListener("click", openOraFile);

// Handling file input change event
document.getElementById("fileInput").addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (file) {
        // Check for .Ora file extension
        if (!file.name.endsWith('.Ora')) {
            alert('Please select a valid .Ora file.');
            return;
        }

        const reader = new FileReader();
        reader.readAsText(file);

        reader.onload = () => {
            let fileContent = reader.result;
            console.log("📂 File Content:", fileContent); // Debugging ke liye
        
            let data;
        
            try {
                // JSON parse karne ki koshish
                data = JSON.parse(fileContent);
                console.log("✅ JSON Parsed Successfully:", data);
            } catch (error) {
                console.error("❌ JSON Parse Error:", error);
                console.warn("⚠️ Treating file as plain text.");
                data = { text: fileContent, media: [] };
            }
        
            // Text load karna
            document.getElementById("editor").innerHTML = data.text || "";
        
            // Media load karna
            if (data.media) {
                localStorage.setItem("media", JSON.stringify(data.media));
                loadMedia();
            }
        };
        
        
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
        };
    } else {
        console.error('No file selected');
    }
});



// Add Media to Sidebar
function addMedia(event) {
    let file = event.target.files[0];
    let reader = new FileReader();

    reader.onload = function (e) {
        let mediaElement;
        if (file.type.startsWith("image")) {
            mediaElement = `<img src="${e.target.result}" class="side-media-item">`;
        } else if (file.type.startsWith("video")) {
            mediaElement = `<video src="${e.target.result}" class="side-media-item" controls></video>`;
        }
        document.getElementById("editor").innerHTML += mediaElement;
    };

    reader.readAsDataURL(file);
}

// Media Upload
document.getElementById("uploadMedia").addEventListener("change", function (event) {
    const files = event.target.files;
    let mediaArray = JSON.parse(localStorage.getItem("media") || "[]");

    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const mediaUrl = e.target.result;
            mediaArray.push({
                url: mediaUrl,
                type: file.type.startsWith("image") ? "image" : "video",
            });

            localStorage.setItem("media", JSON.stringify(mediaArray));
            loadMedia();
        };
        reader.readAsDataURL(file);
    }
});

// Remove Media
function removeMedia(index) {
    let mediaArray = JSON.parse(localStorage.getItem("media") || "[]");
    mediaArray.splice(index, 1);
    localStorage.setItem("media", JSON.stringify(mediaArray));
    loadMedia();
}

// Insert Media to Editor (Mobile View)
function insertMediaToEditor(mediaUrl, fileType) {
    let mediaElement;
    if (fileType === "image") {
        mediaElement = `<img src="${mediaUrl}" class="media-item">`;
    } else if (fileType === "video") {
        mediaElement = `<video src="${mediaUrl}" class="media-item" controls></video>`;
    } else {
        console.error("Unsupported media type:", fileType);
        return;
    }

    document.getElementById("editor").innerHTML += mediaElement;
}

// Load Media from Local Storage
function loadMedia() {
    const mediaContainer = document.getElementById("mediaContainer");
    mediaContainer.innerHTML = "";
    const mediaArray = JSON.parse(localStorage.getItem("media") || "[]");

    mediaArray.forEach((media, index) => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("media-wrapper");

        const mediaItem = document.createElement(media.type === "image" ? "img" : "video");
        mediaItem.src = media.url;
        mediaItem.classList.add("side-media-item");
        if (media.type === "video") {
            mediaItem.controls = true;
        }

        // Remove Icon (Trash)
        const removeIcon = document.createElement("i");
        removeIcon.className = "fas fa-trash-alt remove-icon";
        removeIcon.onclick = () => removeMedia(index);

        // Insert Icon (➕) for Mobile View
        const insertIcon = document.createElement("i");
        insertIcon.className = "fas fa-plus-circle insert-icon";
        insertIcon.onclick = () => insertMediaToEditor(media.url, media.type);

        // Add Icons inside Media Item
        wrapper.appendChild(mediaItem);
        wrapper.appendChild(insertIcon);  // Insert Icon inside media item
        wrapper.appendChild(removeIcon);  // Remove Icon inside media item

        mediaContainer.appendChild(wrapper);
    });
}

// Load media on startup
loadMedia();

// Change Text Color
function changeTextColor(color) {
    document.execCommand("foreColor", false, color);
}

function formatText(command, value = null) {
    if (command === "fontsize") {
        document.execCommand("fontSize", false, "7"); // Compatibility ke liye
        document.querySelectorAll("font[size='7']").forEach(font => {
            font.removeAttribute("size");
            font.style.fontSize = value; // Custom font-size apply karo
        });
    }  
    else if (command === "fontname") {
        document.execCommand("fontName", false, value); // Font family apply karega
    }  
    else if (command === "heading") {
        let selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        let range = selection.getRangeAt(0);
        let selectedText = range.extractContents();

        let newElement = document.createElement(value); // Heading tag create karega
        newElement.appendChild(selectedText);

        range.deleteContents(); // Purana content delete karo
        range.insertNode(newElement);

        // Selection ko maintain rakhne ke liye
        selection.removeAllRanges();
        let newRange = document.createRange();
        newRange.selectNodeContents(newElement);
        selection.addRange(newRange);
    }  
    else {
        document.execCommand(command, false, value);
    }
}

// Remove media from localStorage and UI
function removeMedia(index) {
    let mediaArray = JSON.parse(localStorage.getItem("media")) || [];
    mediaArray.splice(index, 1);
    localStorage.setItem("media", JSON.stringify(mediaArray));
    loadMedia(); // Refresh the UI
}

// Load media when the page loads
document.addEventListener("DOMContentLoaded", loadMedia);


// Remove Media
function removeMedia(index) {
    let mediaArray = JSON.parse(localStorage.getItem("media") || "[]");
    mediaArray.splice(index, 1);
    localStorage.setItem("media", JSON.stringify(mediaArray));
    loadMedia();
}


// Save or Update Ora File
/*function saveOraFile() {
    const content = document.getElementById("editor").innerHTML;
    let fileName = prompt("Enter project name:", "NewFile");

    if (!fileName) return;

    if (localStorage.getItem(fileName)) {
        if (!confirm(`"${fileName}" already exists. Do you want to update it?`)) return;
    }

    const oraData = { name: fileName, text: content };
    localStorage.setItem(fileName, JSON.stringify(oraData));

    alert("File saved successfully!");
    
    // ✅ Save hone ke baad recent files update karo
    loadRecentFiles();
}*/

// Rename File
function renameFile(oldName) {
    let newName = prompt("Enter new file name:", oldName);
    if (!newName || oldName === newName) return;

    let fileData = JSON.parse(localStorage.getItem(oldName));
    fileData.name = newName;

    localStorage.setItem(newName, JSON.stringify(fileData));
    localStorage.removeItem(oldName);

    loadRecentFiles();
}

// Delete File
function deleteFile(fileName) {
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
        localStorage.removeItem(fileName);
        loadRecentFiles();
    }
}

// Share File (Copy to Clipboard)
function shareFile(fileData) {
    const fileContent = JSON.stringify(fileData);
    navigator.clipboard.writeText(fileContent).then(() => {
        alert("File copied to clipboard! Share it with others.");
    });
}


function loadRecentFiles() {
    console.log("Recent files loaded.");
    // Aap yahan apni recent files ko fetch karne ka code likh sakte hain
}
document.addEventListener("DOMContentLoaded", loadRecentFiles);


// ✅ Page load hone ke saath recent files load karo
document.addEventListener("DOMContentLoaded", loadRecentFiles);

function downloadOraFile() {
    const content = document.getElementById("editor").innerHTML;
    const fileName = prompt("Enter file name to download:", "NewFile");

    if (!fileName) return;

    const oraData = { name: fileName, text: content };
    const fileBlob = new Blob([JSON.stringify(oraData)], { type: "application/json" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(fileBlob);
    link.download = fileName + ".Ora";
    link.click();

    URL.revokeObjectURL(link.href);
}

// Drag and Drop Media
document.getElementById("editor").ondrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            let mediaElement;
            if (file.type.startsWith("image/")) {
                mediaElement = `<img src="${e.target.result}" class="media-item">`;
            } else if (file.type.startsWith("video/")) {
                mediaElement = `<video src="${e.target.result}" class="media-item" controls></video>`;
            } else {
                alert("Unsupported file type! Please drop an image or video.");
                return;
            }

            document.getElementById("editor").innerHTML += mediaElement;

            // Save to localStorage
            let mediaArray = JSON.parse(localStorage.getItem("media")) || [];
            mediaArray.push({ url: e.target.result, type: file.type });
            localStorage.setItem("media", JSON.stringify(mediaArray));

            loadMedia(); // Refresh the sidebar
        };
        reader.readAsDataURL(file);
    }
};

// Show options menu when a media item is clicked
document.getElementById("editor").addEventListener("click", function (event) {
    // Sirf editor ke andar wale media items par kaam kare
    if (event.target.classList.contains("media-item") && event.target.closest("#editor")) {
        showOptions(event.target);
    }
});


// Function to show options menu near the media
function showOptions(mediaElement) {
    let existingMenu = document.getElementById("media-options");
    if (existingMenu) existingMenu.remove(); // Remove existing menu if open

    let menu = document.createElement("div");
    menu.id = "media-options";
    menu.className = "options-menu";
    menu.innerHTML = `
        <button onclick="resizeMedia('${mediaElement.src}')">Resize</button>
        <button onclick="cropMedia('${mediaElement.src}')">Crop</button>
        <button onclick="setBorderRadius('${mediaElement.src}')">Border Radius</button>
        <input type="color" onchange="setBorderColor('${mediaElement.src}', this.value)" />
        <button onclick="deleteMedia('${mediaElement.src}')">Delete</button>
    `;

    document.body.appendChild(menu);

    // Position the menu near the clicked media
    let rect = mediaElement.getBoundingClientRect();
    menu.style.top = `${rect.top + window.scrollY + 10}px`;
    menu.style.left = `${rect.left + window.scrollX + 10}px`;

    // Hide menu when clicking outside
    document.addEventListener("click", function hideMenu(e) {
        if (!menu.contains(e.target) && e.target !== mediaElement) {
            menu.remove();
            document.removeEventListener("click", hideMenu);
        }
    });
}

// Resize function
function resizeMedia(url) {
    let media = document.querySelector(`img[src="${url}"], video[src="${url}"]`);
    let newSize = prompt("Enter new width (px):", "200");
    if (newSize) media.style.width = newSize + "px";
}

// Crop function (basic example, advanced cropping needs canvas)
function cropMedia(url) {
    alert("Cropping feature will be implemented soon!"); // Placeholder
}

// Set border-radius
function setBorderRadius(url) {
    let media = document.querySelector(`img[src="${url}"], video[src="${url}"]`);
    let radius = prompt("Enter border-radius (px):", "10");
    if (radius) media.style.borderRadius = radius + "px";
}

// Set border color
function setBorderColor(url, color) {
    let media = document.querySelector(`img[src="${url}"], video[src="${url}"]`);
    media.style.border = `3px solid ${color}`;
}

// Delete media
function deleteMedia(url) {
    let media = document.querySelector(`img[src="${url}"], video[src="${url}"]`);
    if (confirm("Are you sure you want to delete this media?")) {
        media.remove();
    }
}

// Remove media from localStorage and UI
function removeMedia(index) {
    let mediaArray = JSON.parse(localStorage.getItem("media")) || [];
    mediaArray.splice(index, 1);
    localStorage.setItem("media", JSON.stringify(mediaArray));
    loadMedia(); // Refresh the UI
}

// Attach Event Listener to Edit Buttons
document.querySelectorAll(".editButton").forEach((button) => {
    button.addEventListener("click", function() {
        const fileName = this.dataset.filename; // Get filename from data attribute
        openFileInEditor(fileName);
    });
});


function toggleCase() {
    let selection = window.getSelection();
    if (!selection.rangeCount) return;

    let range = selection.getRangeAt(0);
    let selectedText = range.toString();

    if (!selectedText) return;

    let newText;
    if (selectedText === selectedText.toUpperCase()) {
        newText = selectedText.toLowerCase();
    } else {
        newText = selectedText.toUpperCase();
    }

    let newSpan = document.createElement("span");
    newSpan.textContent = newText;

    range.deleteContents();
    range.insertNode(newSpan);
}
