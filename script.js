// script.js
// Immediately Invoked Function Expression (IIFE) to avoid polluting global scope
(() => {
  /* ================= IndexedDB Setup for File Storage ================= */
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("OraEditorDB", 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
      };
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
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
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function loadFiles() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("files", "readonly");
      const store = transaction.objectStore("files");
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveFile(file) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");
      const request = store.add(file);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
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

  async function deleteFileIndexedDB(fileId) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("files", "readwrite");
      const store = transaction.objectStore("files");
      const request = store.delete(fileId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /* ================= Common Functions for Index and Editor ================= */
  // Projects metadata is still stored in localStorage under the key "projects"
  const PROJECTS_KEY = "projects";
  function loadProjects() {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
  }
  function saveProjects(projects) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }

  /* ---------- Recents & File Actions (Index Page) ---------- */
  async function renderRecents() {
    const recentList = document.getElementById("recent-list");
    if (!recentList) return;
    try {
      const files = await loadFiles();
      // Update projects metadata for recents (optional)
      saveProjects(files);
      recentList.innerHTML = "";
      if (files.length === 0) {
        recentList.innerHTML = "<li>No recent files found.</li>";
      } else {
        files.sort((a, b) => new Date(b.date) - new Date(a.date));
        files.forEach(file => {
          const li = document.createElement("li");
          li.className = "recent-item";
          li.innerHTML = `
            <div class="file-info">
              <span class="file-name">${file.name}</span>
              <span class="file-date">${new Date(file.date).toLocaleString()}</span>
            </div>
            <div class="file-actions">
              <i class="fas fa-edit" title="Edit" onclick="editFile('${file.id}')"></i>
              <i class="fas fa-pen-square" title="Rename" onclick="renameFile('${file.id}')"></i>
              <i class="fas fa-share-alt" title="Share" onclick="shareFile('${file.id}')"></i>
              <i class="fas fa-trash-alt" title="Delete" onclick="deleteFile('${file.id}')"></i>
            </div>
          `;
          recentList.appendChild(li);
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function createNewFileWithName(name) {
  const newFile = {
    id: Date.now().toString(),
    name: name,
    content: "",
    date: new Date().toISOString(),
    size: 0
  };

  try {
    // Wait for the array from IndexedDB
    let files = await loadFiles();
    files.push(newFile);
    // Also add the new file to IndexedDB
    await saveFile(newFile);
    // Optionally update localStorage "projects" or handle it in recents
    // localStorage.setItem("projects", JSON.stringify(files));
    // Set the current file for the editor
    localStorage.setItem("currentFile", newFile.id);
    window.location.href = "editor.html";
  } catch (err) {
    console.error("Error creating file:", err);
  }
}
// In your modal's continue button click handler:
document.getElementById("createFileContinueBtn").addEventListener("click", async function() {
  const fileName = document.getElementById("newFileName").value.trim();
  if (fileName) {
    await createNewFileWithName(fileName);
  } else {
    alert("Please enter a file name.");
  }
});

  function editFile(fileId) {
    localStorage.setItem("currentFile", fileId);
    window.location.href = "editor.html";
  }

  async function renameFile(fileId) {
    try {
      let files = await loadFiles();
      const file = files.find(f => f.id === fileId);
      if (file) {
        const newName = prompt("Enter new name for the file:", file.name);
        if (newName) {
          file.name = newName;
          file.date = new Date().toISOString();
          await updateFile(file);
          renderRecents();
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteFile(fileId) {
    if (confirm("Are you sure you want to delete this file?")) {
      try {
        await deleteFileIndexedDB(fileId);
        renderRecents();
        updateStorageInfo();
      } catch (err) {
        console.error(err);
      }
    }
  }

  /* ---------- Share Functionality ---------- */
  function shareFile(fileId) {
    const shareLink = window.location.origin + "/editor.html?file=" + encodeURIComponent(fileId);
    if (navigator.share) {
      navigator.share({
        title: "Ora Editor File",
        text: "Check out this file on Ora Editor!",
        url: shareLink
      })
      .then(() => console.log("File shared successfully"))
      .catch(error => console.error("Error sharing:", error));
    } else {
      showShareModal(shareLink);
    }
  }
  function showShareModal(link) {
    let modal = document.getElementById("shareModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "share-modal";
      modal.innerHTML = `
        <div class="share-modal-content">
          <span class="share-modal-close">&times;</span>
          <h3>Share This File</h3>
          <div class="share-icons">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}" target="_blank" title="Facebook">
              <i class="fab fa-facebook-f"></i>
            </a>
            <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=Check out this file on Ora Editor!" target="_blank" title="Twitter">
              <i class="fab fa-twitter"></i>
            </a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}" target="_blank" title="LinkedIn">
              <i class="fab fa-linkedin-in"></i>
            </a>
            <a href="mailto:?subject=Check out this file&body=${encodeURIComponent(link)}" title="Email">
              <i class="fas fa-envelope"></i>
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector(".share-modal-close").addEventListener("click", () => {
        modal.style.display = "none";
      });
      modal.addEventListener("click", function(e) {
        if (e.target === modal) modal.style.display = "none";
      });
    }
    modal.style.display = "flex";
  }

  /* ---------- Storage Modal Functions ---------- */
  const TOTAL_STORAGE_MB = 500;
  // Only count app-specific keys (here we count IndexedDB files via loadFiles and also any other keys if needed)
  async function updateStorageInfo() {
    try {
      const files = await loadFiles();
      let totalSizeBytes = 0;
      files.forEach(file => {
        totalSizeBytes += new Blob([JSON.stringify(file)]).size;
      });
      const usedMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
      const percentage = Math.min((totalSizeBytes / (TOTAL_STORAGE_MB * 1024 * 1024)) * 100, 100);
      document.getElementById("progressBar").style.width = percentage + "%";
      document.getElementById("storageText").innerText = `${usedMB} MB / ${TOTAL_STORAGE_MB} MB`;
    } catch (err) {
      console.error(err);
    }
  }
  async function clearStorage() {
    if (confirm("This will delete all saved files and app data. Are you sure?")) {
      try {
        const db = await openDatabase();
        const transaction = db.transaction("files", "readwrite");
        const store = transaction.objectStore("files");
        store.clear();
        transaction.oncomplete = () => {
          renderRecents();
          updateStorageInfo();
          alert("Storage cleared successfully!");
        };
        transaction.onerror = () => console.error("Error clearing storage");
      } catch (err) {
        console.error(err);
      }
    }
  }
  if (document.getElementById("storageIcon"))
    document.getElementById("storageIcon").addEventListener("click", () => {
      updateStorageInfo();
      document.getElementById("storageModal").style.display = "block";
    });
  if (document.getElementById("storageModalClose"))
    document.getElementById("storageModalClose").addEventListener("click", () => {
      document.getElementById("storageModal").style.display = "none";
    });
  if (document.getElementById("clearStorageBtn"))
    document.getElementById("clearStorageBtn").addEventListener("click", clearStorage);
  window.onclick = function(event) {
    const modal = document.getElementById("storageModal");
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };

  /* ---------- Create File Modal Functions ---------- */
  function showCreateFileModal() {
    document.getElementById("createFileModal").style.display = "block";
  }
  if (document.getElementById("createFileCancelBtn"))
    document.getElementById("createFileCancelBtn").addEventListener("click", () => {
      document.getElementById("createFileModal").style.display = "none";
    });
  if (document.getElementById("createFileContinueBtn"))
    document.getElementById("createFileContinueBtn").addEventListener("click", async () => {
      const fileName = document.getElementById("newFileName").value.trim();
      if (fileName) {
        await createNewFileWithName(fileName);
      } else {
        alert("Please enter a file name.");
      }
    });
  window.addEventListener("click", function(event) {
    const modal = document.getElementById("createFileModal");
    if (event.target == modal) {
      modal.style.display = "none";
    }
  });

  /* ---------- Editor Page Specific Functions ---------- */
  // Autosave every 5 seconds into IndexedDB (for current file)
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
          localStorage.setItem("autosaveData", document.getElementById("editor").innerHTML);
        }
      } catch (err) {
        console.error("Autosave error:", err);
      }
    } else {
      localStorage.setItem("autosaveData", document.getElementById("editor").innerHTML);
    }
  }, 5000);

  // On editor page load, load content from IndexedDB (or fallback to autosaveData)
  document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById("editor")) {
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
    }
  });

  /* ---------- Other Utility Functions ---------- */
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

  function openOraFile() {
    const fileInput = document.getElementById("fileInput");
    fileInput.click();
  }
  document.getElementById("openOraFileButton")?.addEventListener("click", openOraFile);
  document.getElementById("fileInput")?.addEventListener("change", (event) => {
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

  /* ---------- Media Functions (still using localStorage for media) ---------- */
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
      <button onclick="insertMediaToEditor('${item.dataURL}', '${item.type}'); event.stopPropagation();">
        <i class="fas fa-plus"></i>
      </button>
      <button onclick="deleteMedia('${item.id}'); event.stopPropagation();">
        <i class="fas fa-trash"></i>
      </button>
    `;
    wrapperDiv.appendChild(mediaElement);
    wrapperDiv.appendChild(controlsDiv);
    mediaContainer.appendChild(wrapperDiv);
  }
  function insertMediaToEditor(dataURL, fileType) {
    if (fileType.startsWith("image/")) {
      document.execCommand("insertHTML", false, `<img src="${dataURL}" style="max-width:200px;">`);
    } else if (fileType.startsWith("video/")) {
      document.execCommand("insertHTML", false, `<video src="${dataURL}" controls style="max-width:200px;"></video>`);
    }
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

  /* ---------- Manual Crop Functionality ---------- */
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

  /* ---------- Insert Media into Editor with Overlay Options ---------- */
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

  /* ---------- Open .Ora File Functionality ---------- */
  function openOraFile() {
    const fileInput = document.getElementById("fileInput");
    fileInput.click();
  }
  document.getElementById("openOraFileButton")?.addEventListener("click", openOraFile);
  document.getElementById("fileInput")?.addEventListener("change", (event) => {
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

  /* ---------- Editor Page Save Button ---------- */
  document.getElementById("saveBtn")?.addEventListener("click", async () => {
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

  /* ---------- Context Menu & Utility Functions ---------- */
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

  /* ---------- Load Shared File if URL Parameter is Present ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById("editor")) {
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
    }
  });

  // Periodically update storage info (if the storage modal exists)
  setInterval(updateStorageInfo, 2000);

  // Also, on DOMContentLoaded, if recents element exists, render recents.
  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("recent-list")) renderRecents();
  });

})();