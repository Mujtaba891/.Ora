document.addEventListener('DOMContentLoaded', function() {
  /**
   * Load recent files from localStorage and display them.
   */
  function loadRecents() {
    const recentsContainer = document.getElementById('recentsContainer');
    if (recentsContainer) {
      recentsContainer.innerHTML = ''; // Clear previous entries
    }

    // Retrieve the recents array from localStorage (or use an empty array)
    let recents = JSON.parse(localStorage.getItem("recents")) || [];

    // (Optional) Sort files in reverse chronological order
    recents.sort((a, b) => b.timestamp - a.timestamp);

    recents.forEach(file => {
      const fileDiv = document.createElement('div');
      fileDiv.classList.add('file-entry');

      // Convert timestamp to a human-readable date and time
      const dateObj = new Date(file.timestamp);
      const formattedDate = dateObj.toLocaleDateString();
      const formattedTime = dateObj.toLocaleTimeString();

      // Create the HTML structure for each file entry
      fileDiv.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="file-timestamp">${formattedDate} ${formattedTime}</span>
        <div class="file-actions">
          <button class="edit" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="rename" title="Rename"><i class="fas fa-pencil-alt"></i></button>
          <button class="share" title="Share"><i class="fas fa-share"></i></button>
          <button class="delete" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      `;

      // ----- Action Buttons -----

      // Edit: Open the file in the editor by setting it as the current file.
      fileDiv.querySelector('.edit').addEventListener('click', () => {
        localStorage.setItem("currentFile", file.name);
        window.location.href = "editor.html";
      });

      // Rename: Prompt the user for a new file name and update localStorage.
      fileDiv.querySelector('.rename').addEventListener('click', () => {
        let newName = prompt("Enter new file name:", file.name);
        if (newName) {
          if (!newName.endsWith(".Ora")) {
            newName += ".Ora";
          }
          // Get the file content using the old file name.
          const fileContent = localStorage.getItem(file.name);
          if (fileContent !== null) {
            // Save the content under the new file name and remove the old file.
            localStorage.setItem(newName, fileContent);
            localStorage.removeItem(file.name);

            // Update the recents list: remove the old entry and add the new one.
            let recents = JSON.parse(localStorage.getItem("recents")) || [];
            recents = recents.filter(f => f.name !== file.name);
            recents.push({ name: newName, timestamp: Date.now() });
            localStorage.setItem("recents", JSON.stringify(recents));

            loadRecents();
          }
        }
      });

      // Share: Placeholder functionality (you can add share API logic here).
 // Assuming 'file' is the file object corresponding to this recent file item
fileDiv.querySelector('.share').addEventListener('click', () => {
  if (navigator.share) {
    navigator.share({
      title: file.name,
      text: `Check out my Ora file: ${file.name}`,
      url: window.location.href  // You can customize this URL if needed.
    })
    .then(() => console.log("File shared successfully"))
    .catch((error) => console.error("Error sharing file:", error));
  } else {
    alert("Sharing is not supported on this device.");
  }
});


      // Delete: Confirm deletion, then remove file content and update recents.
      fileDiv.querySelector('.delete').addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete ${file.name}?`)) {
          // Remove the file content
          localStorage.removeItem(file.name);

          // Remove the file from the recents list and update storage.
          let recents = JSON.parse(localStorage.getItem("recents")) || [];
          recents = recents.filter(f => f.name !== file.name);
          localStorage.setItem("recents", JSON.stringify(recents));

          loadRecents();
        }
      });

      if (recentsContainer) {
        recentsContainer.appendChild(fileDiv);
      }
    });
  }

  // ----- Create New File Button -----
  // This button clears any current file and redirects to the editor page.
  const createFileBtn = document.getElementById("createFileBtn");
  if (createFileBtn) {
    createFileBtn.addEventListener('click', function() {
      localStorage.removeItem("currentFile");
      window.location.href = "editor.html";
    });
  }

  // Load recents on page load.
  loadRecents();
});
