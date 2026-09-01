document.addEventListener("DOMContentLoaded", () => {

    /*
     * ----------------------------------------
     * File Upload
     * ----------------------------------------
     */

    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");
    const browseButton = document.getElementById("browseButton");
    const selectedFile = document.getElementById("selectedFile");


    if (uploadArea && fileInput) {

        function showSelectedFile(file) {

            if (!file || !selectedFile) {
                return;
            }

            selectedFile.textContent =
                `Selected: ${file.name}`;

            selectedFile.hidden = false;
        }


        function processFile(file) {

            if (!file) {
                return;
            }

            const maxSize = 25 * 1024 * 1024;

            if (file.size > maxSize) {

                alert(
                    "The selected file is larger than 25 MB."
                );

                fileInput.value = "";

                if (selectedFile) {
                    selectedFile.hidden = true;
                    selectedFile.textContent = "";
                }

                return;
            }

            showSelectedFile(file);
        }


        /*
         * Browse button
         */

        if (browseButton) {

            browseButton.addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();

                    fileInput.click();
                }
            );
        }


        /*
         * Clicking upload area
         */

        uploadArea.addEventListener(
            "click",
            (event) => {

                if (
                    event.target === browseButton ||
                    browseButton?.contains(event.target)
                ) {
                    return;
                }

                fileInput.click();
            }
        );


        /*
         * Keyboard accessibility
         */

        uploadArea.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    fileInput.click();
                }
            }
        );


        /*
         * File selected
         */

        fileInput.addEventListener(
            "change",
            () => {

                if (fileInput.files.length > 0) {

                    processFile(
                        fileInput.files[0]
                    );
                }
            }
        );


        /*
         * Drag over
         */

        uploadArea.addEventListener(
            "dragover",
            (event) => {

                event.preventDefault();

                uploadArea.classList.add(
                    "dragover"
                );
            }
        );


        /*
         * Drag leave
         */

        uploadArea.addEventListener(
            "dragleave",
            () => {

                uploadArea.classList.remove(
                    "dragover"
                );
            }
        );


        /*
         * Drop
         */

        uploadArea.addEventListener(
            "drop",
            (event) => {

                event.preventDefault();

                uploadArea.classList.remove(
                    "dragover"
                );


                const files =
                    event.dataTransfer.files;


                if (!files.length) {
                    return;
                }


                /*
                 * Transfer the dropped file
                 * into the file input.
                 */

                try {

                    const dataTransfer =
                        new DataTransfer();

                    dataTransfer.items.add(
                        files[0]
                    );

                    fileInput.files =
                        dataTransfer.files;

                } catch (error) {

                    console.warn(
                        "Could not assign dropped file.",
                        error
                    );
                }


                processFile(files[0]);
            }
        );
    }


    /*
     * ----------------------------------------
     * Form Validation
     * ----------------------------------------
     */

    const form =
        document.getElementById("recordForm");


    if (form) {

        form.addEventListener(
            "submit",
            (event) => {

                const title =
                    document.getElementById("title");


                if (!title) {
                    return;
                }


                if (title.value.trim() === "") {

                    event.preventDefault();

                    title.focus();

                    title.setCustomValidity(
                        "Please enter a title."
                    );

                    title.reportValidity();

                } else {

                    title.setCustomValidity("");
                }
            }
        );


        const title =
            document.getElementById("title");


        if (title) {

            title.addEventListener(
                "input",
                () => {

                    title.setCustomValidity("");
                }
            );
        }
    }


    /*
     * ----------------------------------------
     * Delete Modal
     * ----------------------------------------
     */

    const deleteModal =
        document.getElementById("deleteModal");

    const deleteButtons =
        document.querySelectorAll(".delete-button");

    const cancelDelete =
        document.getElementById("cancelDelete");

    const confirmDelete =
        document.getElementById("confirmDelete");

    const deleteRecordName =
        document.getElementById("deleteRecordName");


    let lastFocusedElement = null;


    if (
        deleteModal &&
        deleteButtons.length
    ) {

        function openDeleteModal(
            recordId,
            recordTitle,
            button
        ) {

            lastFocusedElement = button;


            deleteRecordName.textContent =
                `"${recordTitle}"`;


            confirmDelete.href =
                `delete.php?id=${encodeURIComponent(recordId)}`;


            deleteModal.classList.add("open");

            deleteModal.setAttribute(
                "aria-hidden",
                "false"
            );


            document.body.style.overflow =
                "hidden";


            cancelDelete.focus();
        }


        function closeDeleteModal() {

            deleteModal.classList.remove(
                "open"
            );

            deleteModal.setAttribute(
                "aria-hidden",
                "true"
            );


            document.body.style.overflow =
                "";


            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }


        deleteButtons.forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.id;

                        const title =
                            button.dataset.title ||
                            "this record";


                        openDeleteModal(
                            id,
                            title,
                            button
                        );
                    }
                );
            }
        );


        if (cancelDelete) {

            cancelDelete.addEventListener(
                "click",
                closeDeleteModal
            );
        }


        const backdrop =
            deleteModal.querySelector(
                ".modal-backdrop"
            );


        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeDeleteModal
            );
        }


        /*
         * Escape closes modal
         */

        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Escape" &&
                    deleteModal.classList.contains(
                        "open"
                    )
                ) {

                    closeDeleteModal();
                }
            }
        );
    }


    /*
     * ----------------------------------------
     * Automatically hide success messages
     * ----------------------------------------
     */

    const successAlert =
        document.querySelector(
            ".alert-success"
        );


    if (successAlert) {

        setTimeout(
            () => {

                successAlert.style.opacity =
                    "0";

                successAlert.style.transform =
                    "translateY(-5px)";

                successAlert.style.transition =
                    "opacity 250ms ease, transform 250ms ease";


                setTimeout(
                    () => {

                        successAlert.remove();

                    },
                    250
                );

            },
            3500
        );
    }

});