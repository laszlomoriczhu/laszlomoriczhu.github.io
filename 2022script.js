// Képek elérési útjai
const images = [];
for (let i = 1; i <= 18; i++) {
    const imgNum = String(i).padStart(3, '0'); // "001", "002" formátum
    images.push(`pics/2022/image${imgNum}.jpg`);
}

// Konténer, ahova a képek kerülnek
const imagesContainer = document.getElementById('imagesContainer');

// Generálás
images.forEach((imgSrc, index) => {
    // Minden harmadik kép után új "box" div
    if (index % 3 === 0) {
        const boxDiv = document.createElement('div');
        boxDiv.className = 'box';
        imagesContainer.appendChild(boxDiv);
    }
    
    // Új "dream" div a képnek
    const dreamDiv = document.createElement('div');
    dreamDiv.className = 'dream';
    const imgElement = document.createElement('img');
    imgElement.src = imgSrc;
    dreamDiv.appendChild(imgElement);

    // Hozzáadás az utolsó "box" divhez
    const lastBox = imagesContainer.lastChild;
    lastBox.appendChild(dreamDiv);
});
