// ----- Existing Code Start -----
  const closePanelBtn = document.getElementById("closePanel");

  /* ========= IndexedDB Setup ========= */
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("OraEditorDB", 1);
      request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
      };
      request.onsuccess = function(event) {
        resolve(event.target.result);
      };
      request.onerror = function(event) {
        reject("Database error: " + event.target.errorCode);
      };
    });
  }

  async function loadFile(fileId) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("files", "readonly");
      const store = transaction.objectStore("files");
      const request = store.get(fileId);
      request.onsuccess = function() {
        resolve(request.result);
      };
      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  async function updateFile(file) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");
      const request = store.put(file);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /* ========= Autosave & Load ========= */
  // Autosave every 2 seconds (aap chahein to 5 sec bhi use kar sakte hain)
  setInterval(async () => {
    const currentFileId = localStorage.getItem("currentFile");
    if (currentFileId) {
      try {
        let file = await loadFile(currentFileId);
        if (file) {
          file.content = document.getElementById("editor").innerHTML;
          file.date = new Date().toISOString();
          await updateFile(file);
        } else {
          // Agar file na mile to autosaveData mein save karein.
          localStorage.setItem("autosaveData", document.getElementById("editor").innerHTML);
        }
      } catch (err) {
        console.error("Autosave error:", err);
      }
    } else {
       localStorage.setItem("autosaveData", document.getElementById("editor").innerHTML);
    }
  }, 2000);

  // On page load, load content from IndexedDB or autosaveData.
  document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    let fileId = urlParams.get("file") || localStorage.getItem("currentFile");
    if (fileId) {
      localStorage.setItem("currentFile", fileId);
      try {
        const file = await loadFile(fileId);
        if (file && typeof file.content !== "undefined") {
          document.getElementById("editor").innerHTML = file.content;
        } else {
          console.warn("File not found in IndexedDB. Loading autosaveData if available.");
          const autosave = localStorage.getItem("autosaveData");
          if (autosave) {
            document.getElementById("editor").innerHTML = autosave;
          }
        }
      } catch (err) {
        console.error("Error loading file:", err);
      }
    } else {
      const autosave = localStorage.getItem("autosaveData");
      if (autosave) {
        document.getElementById("editor").innerHTML = autosave;
      }
    }
  });

  /* ========= Save Button ========= */
  document.getElementById("saveBtn").addEventListener("click", async () => {
    const currentFileId = localStorage.getItem("currentFile");
    if (!currentFileId) {
      alert("No file selected! Please create a new file from the home page.");
      return;
    }
    try {
      let file = await loadFile(currentFileId);
      if (!file) {
        alert("File not found in database.");
        return;
      }
      file.content = document.getElementById("editor").innerHTML;
      file.date = new Date().toISOString();
      await updateFile(file);
      alert("File updated successfully!");
      window.location.href = "index.html";
    } catch (err) {
      console.error("Error saving file:", err);
      alert("Error saving file.");
    }
  });

  /* ========= Download Function ========= */
  function downloadOraFile() {
    const editorContent = document.getElementById("editor").innerHTML;
    if (!editorContent.trim()) {
      alert("Cannot download an empty file!");
      return;
    }
    let fileName = localStorage.getItem("currentFile") || prompt("Enter file name:", "example.Ora");
    if (!fileName) return;
    if (!fileName.endsWith(".Ora")) {
      fileName += ".Ora";
    }
    const blob = new Blob([editorContent], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  // Toggle download dropdown visibility
  document.getElementById("downloadButton").addEventListener("click", function(e) {
    const dropdown = document.getElementById("downloadDropdown");
    dropdown.style.display = (dropdown.style.display === "none" || dropdown.style.display === "") ? "block" : "none";
    e.stopPropagation();
  });

  // Hide dropdown when clicking outside
  document.addEventListener("click", function() {
    document.getElementById("downloadDropdown").style.display = "none";
  });

  // MAIN download function – calls the appropriate converter based on type.
  function downloadAs(type) {
    const editorContent = document.getElementById("editor").innerHTML;
    if (!editorContent.trim()) {
      alert("Cannot download an empty file!");
      return;
    }
    let fileName = localStorage.getItem("currentFile") || prompt("Enter file name:", "example");
    if (!fileName) return;

    switch (type) {
      case "Ora":
        if (!fileName.endsWith(".Ora")) fileName += ".Ora";
        /*const oraBlob = new Blob([editorContent], { type: "application/octet-stream" });
        triggerDownload(oraBlob, fileName);
        break;
      case "PDF":
        {
          // Ensure jsPDF is available
          const { jsPDF } = window.jspdf || {};
          if (!jsPDF) {
            alert("jsPDF library is not loaded.");
            return;
          }
          // Create a new jsPDF instance
          const doc = new jsPDF();
          // Simple text conversion. For complex content, html2canvas may be used.
          doc.text(document.getElementById("editor").innerText, 15, 15);
          if (!fileName.toLowerCase().endsWith(".pdf")) fileName += ".pdf";
          doc.save(fileName);
        }*/
        break;
      case "PNG":
      case "JPG":
        {
          // New functionality: Check if multiple pages (editor divs) exist.
          const mimeType = type === "PNG" ? "image/png" : "image/jpeg";
          const editorPages = document.querySelectorAll(".editor-canvas");
          if (editorPages.length > 1) {
            // Multiple pages: Capture each page and bundle in ZIP.
            downloadMultiplePagesAsImages(editorPages, mimeType, fileName, type.toLowerCase());
          } else {
            // Single page: Use html2canvas on the single editor.
            html2canvas(document.getElementById("editor")).then(canvas => {
              const dataURL = canvas.toDataURL(mimeType);
              if (!fileName.toLowerCase().endsWith("." + type.toLowerCase())) {
                fileName += "." + type.toLowerCase();
              }
              const imgBlob = dataURLtoBlob(dataURL, mimeType);
              triggerDownload(imgBlob, fileName);
            });
          }
        }
        break;
      default:
        console.error("Unknown download type:", type);
    }
    // Hide dropdown after selection
    document.getElementById("downloadDropdown").style.display = "none";
  }

  // Helper function: triggers a download for a given blob and file name
  function triggerDownload(blob, fileName) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  // Helper function: converts dataURL to Blob
  function dataURLtoBlob(dataURL, mimeType) {
    const byteString = atob(dataURL.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  }

  /* ========= Other Functions (Undo, Redo, Cut, Copy, Paste) ========= */
  function undoAction() {
    document.execCommand("undo", false, null);
  }
  function redoAction() {
    document.execCommand("redo", false, null);
  }
  function cutText() {
    document.execCommand("cut");
  }
  function copyText() {
    document.execCommand("copy");
  }
  function pasteText() {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(text => {
        document.execCommand("insertText", false, text);
      }).catch(err => {
        console.error("Clipboard read failed:", err);
        alert("Paste functionality not supported. Please use your device’s native paste option.");
      });
    } else {
      alert("Paste functionality not supported in this browser.");
    }
  }
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });

  // Zooming functionality
  let zoomLevel = 1; // Starting zoom level
  document.getElementById("zoomIn").addEventListener("click", () => {
    zoomLevel += 0.1;
    document.getElementById("editor").style.transform = `scale(${zoomLevel})`;
  });
  document.getElementById("zoomOut").addEventListener("click", () => {
    zoomLevel = Math.max(0.5, zoomLevel - 0.1);
    document.getElementById("editor").style.transform = `scale(${zoomLevel})`;
  });

document.getElementById("fileInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    console.error("No file selected");
    return;
  }
  const fileName = file.name.toLowerCase();
  const reader = new FileReader();
  
  // Sirf .Ora file import ko support karen
  if (fileName.endsWith(".ora")) {
    reader.readAsText(file);
    reader.onload = () => {
      let fileContent = reader.result;
      let data;
      try {
        data = JSON.parse(fileContent);
        console.log("✅ JSON Parsed Successfully:", data);
      } catch (error) {
        console.error("❌ JSON Parse Error:", error);
        console.warn("⚠️ Treating file as plain text.");
        data = { text: fileContent, media: [] };
      }
      document.getElementById("editor").innerHTML = data.text || "";
      if (data.media) {
        localStorage.setItem("media", JSON.stringify(data.media));
        loadMediaItems();
      }
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
    };
  } else {
    alert("Please select a valid .Ora file.");
  }
});
  // Function to display PDF using pdf.js
  function displayPDF(fileURL) {
  const pdfContainer = document.getElementById("editor");
  pdfContainer.innerHTML = ""; // Purani content clear kar dein

  // Ek container jismein tamam pages add hon
  const pagesContainer = document.createElement("div");
  pagesContainer.className = "pages-container";
  pdfContainer.appendChild(pagesContainer);

  const loadingTask = pdfjsLib.getDocument(fileURL);
  loadingTask.promise.then((pdf) => {
    // Har page ke liye loop chalayein
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      pdf.getPage(pageNumber).then((page) => {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.className = "editor-canvas";
        // A4 size style (CSS se bhi manage kar sakte hain)
        canvas.style.width = "21cm";
        canvas.style.height = "29.7cm";
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        pagesContainer.appendChild(canvas);

        const ctx = canvas.getContext("2d");
        const renderContext = { canvasContext: ctx, viewport: viewport };
        page.render(renderContext);
      });
    }
  }).catch((error) => {
    console.error("❌ PDF Load Error:", error);
  });
}
  // MAIN SIDEBAR ACTIONS
  homeBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
  saveBtn.addEventListener("click", () => {
    document.getElementById("saveModal").style.display = "block";
  });
  mediaBtn.addEventListener("click", () => {
    openPanel("media");
  });
  textBtn.addEventListener("click", () => {
    openPanel("text");
  });

  // SAVE MODAL ACTIONS
  document.getElementById("saveBtn").addEventListener("click", () => {
    let currentFileId = localStorage.getItem("currentFile");
    if (!currentFileId) {
      alert("No file selected! Please create a new file from the home page.");
      return;
    }
    localStorage.setItem(currentFileId, editor.innerHTML);
    let projects = JSON.parse(localStorage.getItem("projects") || "[]");
    const now = new Date().toISOString();
    const projectIndex = projects.findIndex(p => p.id === currentFileId);
    if (projectIndex >= 0) {
      projects[projectIndex].content = editor.innerHTML;
      projects[projectIndex].date = now;
      localStorage.setItem("projects", JSON.stringify(projects));
    }
    alert("File updated successfully!");
    window.location.href = "index.html";
  }); 

  // SECONDARY SIDEBAR HANDLING
  function openPanel(type) {
    mainSidebar.classList.add("hidden");
    secondarySidebar.style.display = "block";
    if (type === "media") {
      panelContent.innerHTML = `
        <h2>Media</h2>
        <button class="format-btn" onclick="document.getElementById('fileInputMedia').click()">
          <i class="fas fa-upload"></i> Upload Media
        </button>
        <input type="file" id="fileInputMedia" accept="image/*,video/*" style="display:none;" onchange="addMedia(event)"/>
        <div>
          <div id="mediaContainer"></div>
        </div>
      `;
    } else if (type === "text") {
      panelContent.innerHTML = `
<div class="icon1">
            <button class="format-btn" onclick="formatText('bold')"><i class="fas fa-bold"></i></button>
            <button class="format-btn" onclick="formatText('italic')"><i class="fas fa-italic"></i></button>
            <button class="format-btn" onclick="formatText('underline')"><i class="fas fa-underline"></i></button>
            <button class="format-btn" onclick="toggleCase()"><i class="fas fa-text-height"></i></button>
            <button class="format-btn" id="alignToggle" onclick="toggleAlignment()">
              <i class="fas fa-align-left"></i>
            </button>
          </div><hr/>
          <div class="icon2">
            <button class="format-btn" onclick="applyTag('H1')">H1</button>
            <button class="format-btn" onclick="applyTag('H2')">H2</button>
            <button class="format-btn" onclick="applyTag('H3')">H3</button>
            <button class="format-btn" onclick="applyTag('P')">P</button>
          </div><hr/>
          <div class="">
            <button class="format-btn" onclick="formatText('fontsize','1px')">1px</button>
            <button class="format-btn" onclick="formatText('fontsize','8px')">2px</button>
            <button class="format-btn" onclick="formatText('fontsize','9px')">3px</button>
            <button class="format-btn" onclick="formatText('fontsize','10px')">4px</button>
            <button class="format-btn" onclick="formatText('fontsize','12px')">5px</button>
            <button class="format-btn" onclick="formatText('fontsize','14px')">6px</button>
            <button class="format-btn" onclick="formatText('fontsize','16px')">6px</button>
            <button class="format-btn" onclick="formatText('fontsize','18px')">7px</button>
            <button class="format-btn" onclick="formatText('fontsize','20px')">8px</button>
            <button class="format-btn" onclick="formatText('fontsize','22px')">9px</button>
            <button class="format-btn" onclick="formatText('fontsize','24px')">10px</button>
          </div><hr/>
          <div style="margin-bottom:10px;">
            <div id="colorPalette" style="display: flex; flex-wrap: wrap; gap: 2px; margin-top: 2px;"></div>
          </div><hr/>
          <div style="margin-bottom:10px;">
            <div id="fontContainer" style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; max-height:200px; overflow-y:auto;"></div>
          </div>
      `;
      createColorPalette();
      createFontPalette();
    }
  }
  closePanelBtn.addEventListener("click", () => {
    secondarySidebar.style.display = "none";
    mainSidebar.classList.remove("hidden");
    panelContent.innerHTML = "";
  });

  // COLOR PALETTE
  function createColorPalette() {
    const colorPaletteDiv = document.getElementById("colorPalette");
    if (!colorPaletteDiv) return;
    colorPaletteDiv.innerHTML = "";
    colorPaletteArr.forEach((color) => {
      const btn = document.createElement("button");
      btn.className = "color-swatch";
      btn.style.backgroundColor = color;
      btn.addEventListener("click", () => {
        changeTextColor(color);
      });
      colorPaletteDiv.appendChild(btn);
    });
  }

  const colorPaletteArr = [
    "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
      "#C0C0C0", "#808080", "#800000", "#808000", "#008000", "#800080", "#008080", "#000080",
      "#FFA07A", "#DC143C", "#B22222", "#CD5C5C", "#F08080", "#FA8072", "#E9967A",
      "#FFA500", "#FF4500", "#FFD700", "#DAA520", "#FF8C00", "#B8860B", "#DEB887",
      "#006400", "#008000", "#32CD32", "#00FF00", "#7FFF00", "#ADFF2F", "#228B22",
      "#2E8B57", "#66CDAA", "#20B2AA", "#5F9EA0", "#008B8B", "#00CED1",
      "#4682B4", "#1E90FF", "#4169E1", "#0000CD", "#00008B", "#000080", "#191970",
      "#87CEFA", "#00BFFF", "#87CEEB", "#6495ED",
      "#800080", "#8A2BE2", "#9932CC", "#9400D3", "#4B0082", "#6A5ACD", "#7B68EE",
      "#BA55D3", "#DDA0DD", "#DA70D6", "#C71585", "#FF1493", "#FF69B4", "#FFB6C1",
      "#8B4513", "#A0522D", "#D2691E", "#CD853F", "#BC8F8F", "#F4A460", "#D2B48C",
      "#D3D3D3", "#A9A9A9", "#696969", "#778899",
      "#FFDEAD", "#F5DEB3", "#FAEBD7", "#FFE4B5", "#FFDAB9", "#FFE4C4", "#FFF5EE",
      "#F5F5DC", "#FDF5E6", "#EEE8AA", "#F0E68C", "#BDB76B", "#FFFACD", "#FAFAD2",
      "#FFFFE0"
  ];

  // FONT PALETTE
  const fontFamilies = [
    "Roboto", "Open Sans", "Lato", "Montserrat", "Source Sans Pro", "Raleway", "Poppins", "Nunito", "Oswald", "Merriweather",
      "Ubuntu", "PT Sans", "Roboto Condensed", "Noto Sans", "Ubuntu Condensed", "Lora", "Arimo", "Playfair Display", "Noto Serif", "Mulish",
      "Quicksand", "Fira Sans", "Work Sans", "Oxygen", "Cabin", "Exo 2", "Inconsolata", "Rokkitt", "Libre Baskerville", "Karla",
      "Josefin Sans", "Bitter", "PT Serif", "Hind", "Open Sans Condensed", "Monda", "Alegreya", "Titillium Web", "Catamaran", "Arvo",
      "Spectral", "Assistant", "Varela Round", "Rubik", "Heebo", "Fira Code", "Anton", "Barlow", "PT Sans Narrow", "Ubuntu Mono",
      "Archivo", "Asap", "Cabin Sketch", "Crete Round", "Pacifico", "Permanent Marker", "Dancing Script", "Satisfy", "Amatic SC", "Indie Flower",
      "Patrick Hand", "Gloria Hallelujah", "Architects Daughter", "Reem Kufi", "Shrikhand", "Chewy", "Baloo", "Fredoka One", "Bungee Shade", "Russo One",
      "Prompt", "Exo", "Quantico", "Questrial", "Cormorant Garamond", "EB Garamond", "Rasa", "Chivo", "Rubik Mono One", "Viga",
      "Saira", "Asap Condensed", "Hammersmith One", "Glegoo", "Kumbh Sans", "Signika", "Zilla Slab", "Teko", "Dosis", "Righteous",
      "Barlow Semi Condensed", "Noto Serif JP", "Noto Sans JP", "Sora", "M PLUS Rounded 1c", "Tinos", "Cinzel", "Cuprum", "Pathway Gothic One",
      "Manrope", "Bungee", "Bungee Shade", "Bungee Inline", "Orbitron", "Audiowide", "Righteous", "Monoton", "Cinzel Decorative", "Fontdiner Swanky", "Metal Mania"
  ];
  function createFontPalette() {
    const fontContainer = document.getElementById("fontContainer");
    if (!fontContainer) return;
    fontContainer.innerHTML = "";
    fontFamilies.forEach((font) => {
      const btn = document.createElement("button");
      btn.className = "format-btn";
      btn.textContent = font;
      btn.style.fontFamily = font;
      btn.style.fontSize = "14px";
      btn.style.padding = "8px";
      btn.style.cursor = "pointer";
      btn.style.border = "1px solid #ccc";
      btn.style.borderRadius = "5px";
      btn.style.background = "#f9f9f9";
      btn.style.margin = "3px";
      btn.addEventListener("click", () => {
        applyFont(font);
      });
      fontContainer.appendChild(btn);
    });
  }
  function applyFont(font) {
    const editor = document.getElementById("editor");
    if (!editor) return;
    document.execCommand("fontName", false, font);
  }
  createFontPalette();

  // TEXT FONT SIZE FUNCTIONS
  function formatText(command, value = null) {
    if (command === "fontsize") {
      document.execCommand("fontSize", false, "7");
      let fonts = document.getElementsByTagName("font");
      for (let i = 0; i < fonts.length; i++) {
        if (fonts[i].size == "7") {
          fonts[i].removeAttribute("size");
          fonts[i].style.fontSize = value;
        }
      }
    } else {
      document.execCommand(command, false, value);
    }
  }
  function toggleCase() {
    let selection = window.getSelection().toString();
    if (selection) {
      let transformed = selection === selection.toUpperCase() ? selection.toLowerCase() : selection.toUpperCase();
      document.execCommand("insertText", false, transformed);
    }
  }
  function changeTextColor(color) {
    document.execCommand("foreColor", false, color);
  }
  function applyTag(tagName) {
    if (["H1", "H2", "H3", "P", "BLOCKQUOTE", "PRE", "DIV"].includes(tagName)) {
      document.execCommand("formatBlock", false, tagName);
    } else if (tagName === "SPAN") {
      document.execCommand("fontName", false, "inherit");
    }
  }
  let currentAlignment = "left";
  function toggleAlignment() {
    if (currentAlignment === "left") {
      document.execCommand('justifyCenter', false, null);
      currentAlignment = "center";
      document.getElementById("alignToggle").innerHTML = '<i class="fas fa-align-center"></i>';
    } else if (currentAlignment === "center") {
      document.execCommand('justifyRight', false, null);
      currentAlignment = "right";
      document.getElementById("alignToggle").innerHTML = '<i class="fas fa-align-right"></i>';
    } else {
      document.execCommand('justifyLeft', false, null);
      currentAlignment = "left";
      document.getElementById("alignToggle").innerHTML = '<i class="fas fa-align-left"></i>';
    }
  }

  /* ========= Media Functions (using localStorage for media) ========= */
  const MEDIA_STORAGE_KEY = "mediaItems";
  function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
  }
  function saveMediaItem(item) {
    let items = JSON.parse(localStorage.getItem(MEDIA_STORAGE_KEY)) || [];
    items.push(item);
    localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(items));
  }
  function deleteMediaItem(id) {
    let items = JSON.parse(localStorage.getItem(MEDIA_STORAGE_KEY)) || [];
    items = items.filter(item => item.id !== id);
    localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(items));
  }
  function loadMediaItems() {
    let items = JSON.parse(localStorage.getItem(MEDIA_STORAGE_KEY)) || [];
    const mediaContainer = document.getElementById("mediaContainer");
    if (!mediaContainer) return;
    mediaContainer.innerHTML = "";
    items.forEach(item => {
      addMediaItemToContainer(item);
    });
  }
  function addMedia(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataURL = e.target.result;
      const id = generateId();
      const item = { id, dataURL, type: file.type };
      saveMediaItem(item);
      addMediaItemToContainer(item);
    };
    reader.readAsDataURL(file);
  }
  function addMediaItemToContainer(item) {
    const mediaContainer = document.getElementById("mediaContainer");
    if (!mediaContainer) return;
    const wrapperDiv = document.createElement("div");
    wrapperDiv.className = "media-item";
    wrapperDiv.dataset.id = item.id;
    let mediaElement;
    if (item.type.startsWith("image/")) {
      mediaElement = document.createElement("img");
      mediaElement.src = item.dataURL;
    } else if (item.type.startsWith("video/")) {
      mediaElement = document.createElement("video");
      mediaElement.src = item.dataURL;
      mediaElement.controls = true;
    }
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "media-controls-overlay";
    controlsDiv.innerHTML = `
      <button onclick="insertMediaToEditor('${item.dataURL}', '${item.type}'); event.stopPropagation();"><i class="fas fa-plus"></i></button>
      <button onclick="deleteMedia('${item.id}'); event.stopPropagation();"><i class="fas fa-trash"></i></button>
    `;
    wrapperDiv.appendChild(mediaElement);
    wrapperDiv.appendChild(controlsDiv);
    mediaContainer.appendChild(wrapperDiv);
  }
  function insertMediaToEditor(dataURL, fileType) {
    const editorArea = document.getElementById("editor");
    const mediaWrapper = document.createElement("div");
    mediaWrapper.className = "editor-media-wrapper";
    let mediaElement;
    if (fileType.startsWith("image/")) {
      mediaElement = document.createElement("img");
      mediaElement.src = dataURL;
    } else if (fileType.startsWith("video/")) {
      mediaElement = document.createElement("video");
      mediaElement.src = dataURL;
      mediaElement.controls = true;
    }
    mediaWrapper.appendChild(mediaElement);
    const overlay = document.createElement("div");
    overlay.className = "editor-media-overlay";
    overlay.addEventListener("click", function(e) {
      if(e.target === overlay) {
        overlay.style.display = "none";
      }
      e.stopPropagation();
    });
    const options = [
      { 
        name: "Resize", 
        action: () => {
          let newWidth = prompt("Enter new width (px):", mediaElement.offsetWidth);
          let newHeight = prompt("Enter new height (px):", mediaElement.offsetHeight);
          if(newWidth && newHeight) {
            mediaElement.style.width = newWidth + "px";
            mediaElement.style.height = newHeight + "px";
          }
        } 
      },
      { 
        name: "Crop", 
        action: () => {
          enableCrop(mediaElement);
          overlay.style.display = "none";
        } 
      },
      { 
        name: "Replace", 
        action: () => {
          let fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = fileType.startsWith("image/") ? "image/*" : "video/*";
          fileInput.style.display = "none";
          fileInput.addEventListener("change", function(event) {
            const file = event.target.files[0];
            if(file) {
              const reader = new FileReader();
              reader.onload = function(e) {
                mediaElement.src = e.target.result;
              };
              reader.readAsDataURL(file);
            }
          });
          document.body.appendChild(fileInput);
          fileInput.click();
          fileInput.addEventListener("change", function(){
            document.body.removeChild(fileInput);
          });
        } 
      },
      { 
        name: "Border Radius", 
        action: () => {
          let br = prompt("Enter border radius (px):", "12");
          if(br !== null) {
            mediaElement.style.borderRadius = br + "px";
          }
        } 
      },
      { 
        name: "Border Color", 
        action: () => {
          let color = prompt("Enter border color (CSS color):", "#000000");
          if(color !== null) {
            mediaElement.style.border = "2px solid " + color;
          }
        } 
      },
      { 
         name: "Delete", 
        action: () => { 
          mediaWrapper.remove(); 
        } 
      },
      { 
        name: "Duplicate", 
        action: () => {
          const clone = mediaWrapper.cloneNode(true);
          editorArea.appendChild(clone);
        } 
      }
    ];
    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.textContent = opt.name;
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        opt.action();
      });
      overlay.appendChild(btn);
    });
    mediaWrapper.appendChild(overlay);
    mediaWrapper.addEventListener("click", function(e) {
      if(e.target.tagName.toLowerCase() !== "button") {
        overlay.style.display = (overlay.style.display === "none" || overlay.style.display === "") ? "flex" : "none";
      }
      e.stopPropagation();
    });
    editorArea.appendChild(mediaWrapper);
  }
  function deleteMedia(id) {
    const mediaContainer = document.getElementById("mediaContainer");
    const itemDiv = mediaContainer.querySelector(`[data-id="${id}"]`);
    if (itemDiv) {
      mediaContainer.removeChild(itemDiv);
      deleteMediaItem(id);
    }
  }
  window.addEventListener("DOMContentLoaded", loadMediaItems);

  /* ========= Manual Crop Functionality ========= */
  function enableCrop(mediaElement) {
    const cropOverlay = document.createElement("div");
    cropOverlay.style.position = "absolute";
    cropOverlay.style.top = "0";
    cropOverlay.style.left = "0";
    cropOverlay.style.width = "100%";
    cropOverlay.style.height = "100%";
    cropOverlay.style.background = "rgba(0,0,0,0.2)";
    cropOverlay.style.cursor = "crosshair";
    cropOverlay.style.zIndex = "10";
    mediaElement.parentElement.appendChild(cropOverlay);
    let startX, startY, cropRect;
    cropOverlay.addEventListener("mousedown", startCrop);
    function startCrop(e) {
      e.preventDefault();
      startX = e.offsetX;
      startY = e.offsetY;
      cropRect = document.createElement("div");
      cropRect.style.position = "absolute";
      cropRect.style.border = "2px dashed #fff";
      cropRect.style.background = "rgba(255,255,255,0.3)";
      cropRect.style.left = startX + "px";
      cropRect.style.top = startY + "px";
      cropOverlay.appendChild(cropRect);
      cropOverlay.addEventListener("mousemove", duringCrop);
      cropOverlay.addEventListener("mouseup", endCrop);
    }
    function duringCrop(e) {
      let currentX = e.offsetX;
      let currentY = e.offsetY;
      let width = currentX - startX;
      let height = currentY - startY;
      cropRect.style.width = Math.abs(width) + "px";
      cropRect.style.height = Math.abs(height) + "px";
      cropRect.style.left = (width < 0 ? currentX : startX) + "px";
      cropRect.style.top = (height < 0 ? currentY : startY) + "px";
    }
    function endCrop(e) {
      cropOverlay.removeEventListener("mousemove", duringCrop);
      cropOverlay.removeEventListener("mouseup", endCrop);
      const rect = mediaElement.getBoundingClientRect();
      const cropRectBounds = cropRect.getBoundingClientRect();
      let cropLeft = cropRectBounds.left - rect.left;
      let cropTop = cropRectBounds.top - rect.top;
      let cropWidth = cropRectBounds.width;
      let cropHeight = cropRectBounds.height;
      cropOverlay.parentElement.removeChild(cropOverlay);
      let right = mediaElement.offsetWidth - (cropLeft + cropWidth);
      let bottom = mediaElement.offsetHeight - (cropTop + cropHeight);
      mediaElement.style.clipPath = `inset(${cropTop}px ${right}px ${bottom}px ${cropLeft}px)`;
    }
  }

  /* ========= Open .Ora File Functionality ========= */
  function openOraFile() {
    const fileInput = document.getElementById("fileInput");
    fileInput.click();
  }
  document.getElementById("openOraFileButton").addEventListener("click", openOraFile);
  document.getElementById("fileInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.Ora')) {
        alert('Please select a valid .Ora file.');
        return;
      }
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => {
        let fileContent = reader.result;
        console.log("📂 File Content:", fileContent);
        let data;
        try {
          data = JSON.parse(fileContent);
          console.log("✅ JSON Parsed Successfully:", data);
        } catch (error) {
          console.error("❌ JSON Parse Error:", error);
          console.warn("⚠️ Treating file as plain text.");
          data = { text: fileContent, media: [] };
        }
        document.getElementById("editor").innerHTML = data.text || "";
        if (data.media) {
          localStorage.setItem("media", JSON.stringify(data.media));
          loadMediaItems();
        }
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
      };
    } else {
      console.error('No file selected');
    }
  });

  function undoAction() {
    document.execCommand("undo", false, null);
  }
  function redoAction() {
    document.execCommand("redo", false, null);
  }
  function cutText() {
    document.execCommand("cut");
  }
  function copyText() {
    document.execCommand("copy");
  }
  function pasteText() {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(text => {
        document.execCommand("insertText", false, text);
      }).catch(err => {
        console.error("Clipboard read failed:", err);
        alert("Paste functionality not supported. Please use your device’s native paste option.");
      });
    } else {
      alert("Paste functionality not supported in this browser. Please use your device's native paste option.");
    }
  }
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });

  /* ========= Load Shared File if URL Parameter Present ========= */
  document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const sharedFileId = params.get("file");
    if (sharedFileId) {
      localStorage.setItem("currentFile", sharedFileId);
      try {
        const file = await loadFile(sharedFileId);
        if (file && file.content !== undefined) {
          document.getElementById("editor").innerHTML = file.content;
        } else {
          alert("File not found! It may not exist in your storage.");
        }
      } catch (err) {
        console.error("Error loading shared file:", err);
      }
    } else {
      const currentFileId = localStorage.getItem("currentFile");
      if (currentFileId) {
        try {
          const file = await loadFile(currentFileId);
          if (file && file.content !== undefined) {
            document.getElementById("editor").innerHTML = file.content;
          }
        } catch (err) {
          console.error("Error loading current file:", err);
        }
      } else {
        const autosave = localStorage.getItem("autosaveData");
        if (autosave) {
          document.getElementById("editor").innerHTML = autosave;
        }
      }
    }
  });
  // ----- Existing Code End -----

function formatLinksInEditor() {
  const editor = document.getElementById("editor");
  let content = editor.innerHTML;
  // Regex to detect URLs starting with http:// or https://
  content = content.replace(/(https?:\/\/)([^\s"<]+)/g, function(match, protocol, urlPart) {
    // Create an anchor tag where href is the full URL and display text is without the protocol.
    return `<a href="${match}" target="_blank">${urlPart}</a>`;
  });
  editor.innerHTML = content;
}

// Full Screen Preview Button: Save editor content and redirect to preview page
document.getElementById("fullscreenBtn").addEventListener("click", function() {
  // Get the current content of the editor
  const content = document.getElementById("editor").innerHTML;
  // Save the content in sessionStorage (or localStorage, as per your requirement)
  sessionStorage.setItem("previewContent", content);
  // Redirect to preview page
  window.location.href = "preview.html";
});

// --- Other functions (downloadOraFile, undoAction, etc.) continue here ---