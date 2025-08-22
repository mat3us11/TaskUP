const maxImages = 3;
const grid = document.getElementById('image-grid');

function createSlot(index) {
    const slot = document.createElement('div');
    slot.classList.add('image-slot', 'add');
    slot.id = `slot-${index}`;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.id = `upload-${index}`;

    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.innerHTML = '<span>+</span>';

    input.addEventListener('change', () => handleUpload(input, slot));

    slot.appendChild(input);
    slot.appendChild(label);

    return slot;
}

function handleUpload(input, slot) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
            const img = document.createElement('img');
            img.src = reader.result;

            slot.innerHTML = '';
            slot.appendChild(img);

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '&times;';
            removeBtn.classList.add('remove-btn');
            removeBtn.addEventListener('click', () => {
                slot.remove();
                updateSlots();
            });
            slot.appendChild(removeBtn);

            if (grid.children.length < maxImages) {
                const nextSlot = createSlot(grid.children.length);
                grid.appendChild(nextSlot);
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function updateSlots() {
    const currentSlots = grid.querySelectorAll('.image-slot.add');
    if (grid.children.length < maxImages && currentSlots.length === 0) {
        const nextSlot = createSlot(grid.children.length);
        grid.appendChild(nextSlot);
    }
}

document.getElementById('upload-0').addEventListener('change', (e) => handleUpload(e.target, document.getElementById('slot-0')));
