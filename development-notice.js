const developmentNotice = document.getElementById("developmentNotice");
const closeDevelopmentNotice =
    document.getElementById("closeDevelopmentNotice");

closeDevelopmentNotice.addEventListener("click", () => {
    developmentNotice.close();
});

developmentNotice.showModal();
