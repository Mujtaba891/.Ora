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
"#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#000000", "#FFFFFF", "#FFA500", "#800080", "#00FFFF", "#FF00FF", "#FFC0CB", "#FFD700", "#FF4500", "#FF6347", "#FF8C00", "#FF69B4", "#FF1493","#ff0100", "#ff0300", "#ff0400", "#ff0600", "#ff0700", "#ff0900", "#ff0a00", "#ff0c00", "#ff0d00", "#ff0f00", "#ff1000", "#ff1200", "#ff1300", "#ff1500", "#ff1600", "#ff1800", "#ff1a00", "#ff1b00", "#ff1d00", "#ff1e00", "#ff2000", "#ff2100", "#ff2300", "#ff2400", "#ff2600", "#ff2700", "#ff2900", "#ff2a00", "#ff2c00", "#ff2d00", "#ff2f00", "#ff3000", "#ff3200", "#ff3400", "#ff3500", "#ff3700", "#ff3800", "#ff3a00", "#ff3b00", "#ff3d00", "#ff3e00", "#ff4000", "#ff4100", "#ff4300", "#ff4400", "#ff4600", "#ff4700", "#ff4900", "#ff4a00", "#ff4c00", "#ff4e00", "#ff4f00", "#ff5100", "#ff5200", "#ff5400", "#ff5500", "#ff5700", "#ff5800", "#ff5a00", "#ff5b00", "#ff5d00", "#ff5e00", "#ff6000", "#ff6100", "#ff6300", "#ff6400", "#ff6600", "#ff6800", "#ff6900", "#ff6b00", "#ff6c00", "#ff6e00", "#ff6f00", "#ff7100", "#ff7200", "#ff7400", "#ff7500", "#ff7700", "#ff7800", "#ff7a00", "#ff7b00", "#ff7d00", "#ff7e00", "#ff8000", "#ff8200", "#ff8300", "#ff8500", "#ff8600", "#ff8800", "#ff8900", "#ff8b00", "#ff8c00", "#ff8e00", "#ff8f00", "#ff9100", "#ff9200", "#ff9400", "#ff9500", "#ff9700", "#ff9900", "#ff9a00", "#ff9c00", "#ff9d00", "#ff9f00", "#ffa000", "#ffa200", "#ffa300", "#ffa500", "#ffa600", "#ffa800", "#ffa900", "#ffab00", "#ffac00", "#ffae00", "#ffaf00", "#ffb100", "#ffb300", "#ffb400", "#ffb600", "#ffb700", "#ffb900", "#ffba00", "#ffbc00", "#ffbd00", "#ffbf00", "#ffc000", "#ffc200", "#ffc300", "#ffc500", "#ffc600", "#ffc800", "#ffc900", "#ffcb00", "#ffcd00", "#ffce00", "#ffd000", "#ffd100", "#ffd300", "#ffd400", "#ffd600", "#ffd700", "#ffd900", "#ffda00", "#ffdc00", "#ffdd00", "#ffdf00", "#ffe000", "#ffe200", "#ffe300", "#ffe500", "#ffe700", "#ffe800", "#ffea00", "#ffeb00", "#ffed00", "#ffee00", "#fff000", "#fff100", "#fff300", "#fff400", "#fff600", "#fff700", "#fff900", "#fffa00", "#fffc00", "#fffd00", "#feff00", "#fcff00", "#fbff00", "#f9ff00", "#f8ff00", "#f6ff00", "#f5ff00", "#f3ff00", "#f2ff00", "#f0ff00", "#efff00", "#edff00", "#ecff00", "#eaff00", "#e9ff00", "#e7ff00", "#e6ff00", "#e4ff00", "#e2ff00", "#e1ff00", "#dfff00", "#deff00", "#dcff00", "#dbff00", "#d9ff00", "#d8ff00", "#d6ff00", "#d5ff00", "#d3ff00", "#d2ff00", "#d0ff00", "#cfff00", "#cdff00", "#cbff00", "#caff00", "#c8ff00", "#c7ff00", "#c5ff00", "#c4ff00", "#c2ff00", "#c1ff00", "#bfff00", "#beff00", "#bcff00", "#bbff00", "#b9ff00", "#b8ff00", "#b6ff00", "#b5ff00", "#b3ff00", "#b1ff00", "#b0ff00", "#aeff00", "#adff00", "#abff00", "#aaff00", "#a8ff00", "#a7ff00", "#a5ff00", "#a4ff00", "#a2ff00", "#a1ff00", "#9fff00", "#9eff00", "#9cff00", "#9bff00", "#99ff00", "#97ff00", "#96ff00", "#94ff00", "#93ff00", "#91ff00", "#90ff00", "#8eff00", "#8dff00", "#8bff00", "#8aff00", "#88ff00", "#87ff00", "#85ff00", "#84ff00", "#82ff00", "#81ff00", "#7fff00", "#7dff00", "#7cff00", "#7aff00", "#79ff00", "#77ff00", "#76ff00", "#74ff00", "#73ff00", "#71ff00", "#70ff00", "#6eff00", "#6dff00", "#6bff00", "#6aff00", "#68ff00", "#67ff00", "#65ff00", "#63ff00", "#62ff00", "#60ff00", "#5fff00", "#5dff00", "#5cff00", "#5aff00", "#59ff00", "#57ff00", "#56ff00", "#54ff00", "#53ff00", "#51ff00", "#50ff00", "#4eff00", "#4dff00", "#4bff00", "#49ff00", "#48ff00", "#46ff00", "#45ff00", "#43ff00", "#42ff00", "#40ff00", "#3fff00", "#3dff00", "#3cff00", "#3aff00", "#39ff00", "#37ff00", "#36ff00", "#34ff00", "#33ff00", "#31ff00", "#2fff00", "#2eff00", "#2cff00", "#2bff00", "#29ff00", "#28ff00", "#26ff00", "#25ff00", "#23ff00", "#22ff00", "#20ff00", "#1fff00", "#1dff00", "#1cff00", "#1aff00", "#18ff00", "#17ff00", "#15ff00", "#14ff00", "#12ff00", "#11ff00", "#0fff00", "#0eff00", "#0cff00", "#0bff00", "#09ff00", "#08ff00", "#06ff00", "#05ff00", "#03ff00", "#02ff00", "#00ff00", "#00ff01", "#00ff02", "#00ff04", "#00ff05", "#00ff07", "#00ff08", "#00ff0a", "#00ff0b", "#00ff0d", "#00ff0e", "#00ff10", "#00ff11", "#00ff13", "#00ff14", "#00ff16", "#00ff17", "#00ff19", "#00ff1b", "#00ff1c", "#00ff1e", "#00ff1f", "#00ff21", "#00ff22", "#00ff24", "#00ff25", "#00ff27", "#00ff28", "#00ff2a", "#00ff2b", "#00ff2d", "#00ff2e", "#00ff30", "#00ff31", "#00ff33", "#00ff35", "#00ff36", "#00ff38", "#00ff39", "#00ff3b", "#00ff3c", "#00ff3e", "#00ff3f", "#00ff41", "#00ff42", "#00ff44", "#00ff45", "#00ff47", "#00ff48", "#00ff4a", "#00ff4b", "#00ff4d", "#00ff4f", "#00ff50", "#00ff52", "#00ff53", "#00ff55", "#00ff56", "#00ff58", "#00ff59", "#00ff5b", "#00ff5c", "#00ff5e", "#00ff5f", "#00ff61", "#00ff62", "#00ff64", "#00ff66", "#00ff67", "#00ff69", "#00ff6a", "#00ff6c", "#00ff6d", "#00ff6f", "#00ff70", "#00ff72", "#00ff73", "#00ff75", "#00ff76", "#00ff78", "#00ff79", "#00ff7b", "#00ff7c", "#00ff7e", "#00ff80", "#00ff81", "#00ff83", "#00ff84", "#00ff86", "#00ff87", "#00ff89", "#00ff8a", "#00ff8c", "#00ff8d", "#00ff8f", "#00ff90", "#00ff92", "#00ff93", "#00ff95", "#00ff96", "#00ff98", "#00ff9a", "#00ff9b", "#00ff9d", "#00ff9e", "#00ffa0", "#00ffa1", "#00ffa3", "#00ffa4", "#00ffa6", "#00ffa7", "#00ffa9", "#00ffaa", "#00ffac", "#00ffad", "#00ffaf", "#00ffb0", "#00ffb2", "#00ffb4", "#00ffb5", "#00ffb7", "#00ffb8", "#00ffba", "#00ffbb", "#00ffbd", "#00ffbe", "#00ffc0", "#00ffc1", "#00ffc3", "#00ffc4", "#00ffc6", "#00ffc7", "#00ffc9", "#00ffca", "#00ffcc", "#00ffce", "#00ffcf", "#00ffd1", "#00ffd2", "#00ffd4", "#00ffd5", "#00ffd7", "#00ffd8", "#00ffda", "#00ffdb", "#00ffdd", "#00ffde", "#00ffe0", "#00ffe1", "#00ffe3", "#00ffe4", "#00ffe6", "#00ffe8", "#00ffe9", "#00ffeb", "#00ffec", "#00ffee", "#00ffef", "#00fff1", "#00fff2", "#00fff4", "#00fff5", "#00fff7", "#00fff8", "#00fffa", "#00fffb", "#00fffd", "#00ffff", "#00fdff", "#00fbff", "#00faff", "#00f8ff", "#00f7ff", "#00f5ff", "#00f4ff", "#00f2ff", "#00f1ff", "#00efff", "#00eeff", "#00ecff", "#00ebff", "#00e9ff", "#00e8ff", "#00e6ff", "#00e4ff", "#00e3ff", "#00e1ff", "#00e0ff", "#00deff", "#00ddff", "#00dbff", "#00daff", "#00d8ff", "#00d7ff", "#00d5ff", "#00d4ff", "#00d2ff", "#00d1ff", "#00cfff", "#00ceff", "#00ccff", "#00caff", "#00c9ff", "#00c7ff", "#00c6ff", "#00c4ff", "#00c3ff", "#00c1ff", "#00c0ff", "#00beff", "#00bdff", "#00bbff", "#00baff", "#00b8ff", "#00b7ff", "#00b5ff", "#00b4ff", "#00b2ff", "#00b0ff", "#00afff", "#00adff", "#00acff", "#00aaff", "#00a9ff", "#00a7ff", "#00a6ff", "#00a4ff", "#00a3ff", "#00a1ff", "#00a0ff", "#009eff", "#009dff", "#009bff", "#009aff", "#0098ff", "#0096ff", "#0095ff", "#0093ff", "#0092ff", "#0090ff", "#008fff", "#008dff", "#008cff", "#008aff", "#0089ff", "#0087ff", "#0086ff", "#0084ff", "#0083ff", "#0081ff", "#0080ff", "#007eff", "#007cff", "#007bff", "#0079ff", "#0078ff", "#0076ff", "#0075ff", "#0073ff", "#0072ff", "#0070ff", "#006fff", "#006dff", "#006cff", "#006aff", "#0069ff", "#0067ff", "#0066ff", "#0064ff", "#0062ff", "#0061ff", "#005fff", "#005eff", "#005cff", "#005bff", "#0059ff", "#0058ff", "#0056ff", "#0055ff", "#0053ff", "#0052ff", "#0050ff", "#004fff", "#004dff", "#004bff", "#004aff", "#0048ff", "#0047ff", "#0045ff", "#0044ff", "#0042ff", "#0041ff", "#003fff", "#003eff", "#003cff", "#003bff", "#0039ff", "#0038ff", "#0036ff", "#0035ff", "#0033ff", "#0031ff", "#0030ff", "#002eff", "#002dff", "#002bff", "#002aff", "#0028ff", "#0027ff", "#0025ff", "#0024ff", "#0022ff", "#0021ff", "#001fff", "#001eff", "#001cff", "#001bff", "#0019ff", "#0017ff", "#0016ff", "#0014ff", "#0013ff", "#0011ff", "#0010ff", "#000eff", "#000dff", "#000bff", "#000aff", "#0008ff", "#0007ff", "#0005ff", "#0004ff", "#0002ff", "#0001ff", "#0000ff"
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