document.getElementById('file1').addEventListener('change', async function() {
    var fileName = this.files[0].name;
    document.getElementById('file1-name').textContent = fileName;
    await uploadFile(this, 'original');
});

document.getElementById('file2').addEventListener('change', async function() {
    var fileName = this.files[0].name;
    document.getElementById('file2-name').textContent = fileName;
    await readFile(this, 'changed');
});

document.getElementById('compare-btn').addEventListener('click', async function() {
    await compareFiles();
});

document.getElementById('save-changes-btn').addEventListener('click', async function() {
    await saveChanges();
});

async function uploadFile(input, type) {
    var formData = new FormData();
    formData.append(input.name, input.files[0]);

    try {
        let response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        let data = await response.json();

        if (type === 'original') {
            document.getElementById('original-structure-container').innerHTML = data.combined_structure.original_structure;
            addDirectoryToggle();
            addFileClickEvent();
        } else if (type === 'changed') {
            document.getElementById('changed-file-content').innerText = data.content;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function readFile(input, type) {
    var file = input.files[0];
    var reader = new FileReader();

    reader.onload = function(event) {
        var content = event.target.result;
        if (type === 'changed') {
            document.getElementById('changed-file-content').innerText = content;
        }
    };

    reader.readAsText(file);
}

async function compareFiles() {
    var originalContent = document.getElementById('original-file-content').innerText;
    var changedContent = document.getElementById('changed-file-content').innerText;

    try {
        let response = await fetch('/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                original: originalContent,
                changed: changedContent
            })
        });
        let data = await response.json();
        var resultElement = document.getElementById('comparison-result');
        resultElement.innerHTML = data.differences;
        resultElement.classList.add('show');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function saveChanges() {
    var changedContent = document.getElementById('changed-file-content').innerText;

    try {
        let response = await fetch('/save_changes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                changed: changedContent
            })
        });
        let data = await response.json();
        var resultMessageElement = document.getElementById('result-message');
        resultMessageElement.textContent = data.result;

        if (data.result === "File saved successfully.") {
            resultMessageElement.classList.add('success');
            resultMessageElement.classList.remove('error');
            await reloadOriginalFile(data.file_path);
        } else {
            resultMessageElement.classList.add('error');
            resultMessageElement.classList.remove('success');
        }
    } catch (error) {
        var resultMessageElement = document.getElementById('result-message');
        resultMessageElement.textContent = 'Failed to save changes.';
        resultMessageElement.classList.add('error');
        resultMessageElement.classList.remove('success');
        console.error('Error:', error);
    }
}

async function reloadOriginalFile(filePath) {
    try {
        let response = await fetch('/file?path=' + encodeURIComponent(filePath));
        let data = await response.json();
        if (data.result === "File loaded successfully") {
            document.getElementById('original-file-content').innerText = data.content;
        } else {
            alert(data.result);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

let openDirectories = {};

function addDirectoryToggle() {
    var toggler = document.getElementsByClassName("directory");
    for (var i = 0; i < toggler.length; i++) {
        var directoryPath = toggler[i].getAttribute("data-path");

        if (!toggler[i].classList.contains("bound")) {
            toggler[i].classList.add("bound");
            toggler[i].addEventListener("click", async function() {
                var nested = this.querySelector(".nested");
                if (nested) {
                    nested.classList.toggle("active");
                    this.classList.toggle("directory-open");

                    if (nested.innerHTML === "") {
                        var path = this.getAttribute("data-path");
                        var type = this.getAttribute("data-type");
                        try {
                            let response = await fetch(`/subdirectories?path=${encodeURIComponent(path)}&type=${type}`);
                            let data = await response.json();
                            if (data.result === "Subdirectories loaded successfully") {
                                nested.innerHTML = data.subdirectories;
                                addDirectoryToggle();
                                addFileClickEvent();
                                openDirectories[path] = true;
                                updateOpenDirectories();
                            } else {
                                alert(data.result);
                            }
                        } catch (error) {
                            console.error('Error:', error);
                        }
                    } else {
                        if (nested.classList.contains("active")) {
                            openDirectories[directoryPath] = true;
                        } else {
                            delete openDirectories[directoryPath];
                        }
                        updateOpenDirectories();
                    }
                }
            });
        }

        if (openDirectories[directoryPath]) {
            toggler[i].classList.add("directory-open");
            var nested = toggler[i].querySelector(".nested");
            if (nested) {
                nested.classList.add("active");
            }
        }
    }
}

function updateOpenDirectories() {
    var toggler = document.getElementsByClassName("directory");
    for (var i = 0; i < toggler.length; i++) {
        var directoryPath = toggler[i].getAttribute("data-path");
        if (openDirectories[directoryPath]) {
            toggler[i].classList.add("directory-open");
            var nested = toggler[i].querySelector(".nested");
            if (nested) {
                nested.classList.add("active");
            }
        } else {
            toggler[i].classList.remove("directory-open");
            var nested = toggler[i].querySelector(".nested");
            if (nested) {
                nested.classList.remove("active");
            }
        }
    }
}

function addFileClickEvent() {
    var files = document.getElementsByClassName("file");
    for (var i = 0; i < files.length; i++) {
        if (!files[i].classList.contains("bound")) {
            files[i].classList.add("bound");
            files[i].addEventListener("click", async function() {
                var filePath = this.getAttribute("data-path");
                var fileType = this.getAttribute("data-type");
                try {
                    let response = await fetch('/file?path=' + encodeURIComponent(filePath));
                    let data = await response.json();
                    if (data.result === "File loaded successfully") {
                        if (fileType === 'original') {
                            document.getElementById('original-file-content').innerText = data.content;
                        }
                    } else {
                        alert(data.result);
                    }
                } catch (error) {
                    console.error('Error:', error);
                }
            });
        }
    }
}

document.getElementById('convert-btn').addEventListener('click', async function() {
    const selectedLanguage = document.getElementById('language-select').value;
    const codeInput = document.getElementById('code-input').value;

    try {
        let response = await fetch('/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                language: selectedLanguage,
                code: codeInput
            }),
        });
        let data = await response.json();
        document.getElementById('code-output').textContent = data.converted_code;
    } catch (error) {
        console.error('Error:', error);
    }
});

document.getElementById('comment-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const comment = document.getElementById('user-comment').value;
    const page = document.getElementById('page').value;

    const response = await fetch('/add_comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            comment: comment,
            page: page
        }),
    });

    const data = await response.json();
    if (data.result === "Comment added successfully") {
        location.reload();
    } else {
        alert('Failed to add comment');
    }
});

document.querySelectorAll('.response-form').forEach(form => {
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const commentId = form.getAttribute('data-id');
        const responseText = form.querySelector('textarea').value;

        const response = await fetch('/add_response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                comment_id: commentId,
                response: responseText
            }),
        });

        const data = await response.json();
        if (data.result === "Response added successfully") {
            location.reload();
        } else {
            alert('Failed to add response');
        }
    });
});