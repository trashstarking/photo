// --- УПРАВЛЕНИЕ ЗАГРУЗОЧНЫМ ЭКРАНОМ ---
setTimeout(() => {
    const loader = document.getElementById("loader");
    if(loader) {
        loader.style.opacity = "0";
        setTimeout(() => { 
            loader.style.display = "none"; 
            
            // Назначаем задержку анимации (stagger) для каждой карточки 
            document.querySelectorAll('.gallery-item').forEach((item, index) => {
                item.style.transitionDelay = `${index * 0.15}s`; 
            });
            
            // Включаем главную страницу только СЕЙЧАС
            const projectsPage = document.getElementById('projects');
            if (projectsPage) projectsPage.classList.add('active');
        }, 800);
    }
}, 2800);

// --- СМЕНА ТЕМЫ ---
const themeToggles = document.querySelectorAll('.theme-toggle-btn');
themeToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        themeToggles.forEach(btn => {
            btn.innerText = isDark ? 'Light Theme' : 'Dark Theme';
        });
    });
});

// --- МОБИЛЬНОЕ МЕНЮ ---
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
if(mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('collapsed');
        mobileMenuToggle.innerText = mobileMenu.classList.contains('collapsed') ? '☰' : '✕';
    });
}

// --- ЛОГИКА НАВИГАЦИИ (Открытие страниц) ---
function openPage(pageId, btnElement = null) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId);
    if(targetPage) targetPage.classList.add('active');
    
    document.querySelectorAll('.corner-btn, .mobile-btn').forEach(btn => btn.classList.remove('active-btn'));
    if(btnElement) btnElement.classList.add('active-btn');
    
    window.scrollTo(0, 0);

    document.querySelectorAll('.horizontal-scroll').forEach(container => {
        if(container.targetScroll !== undefined) {
            container.targetScroll = 0;
            container.currentScroll = 0;
            container.scrollLeft = 0;
        }
    });

    if(pageId === 'contact') initPhysics();
}

// --- ПЛАВНЫЙ СКРОЛЛ (ДЕСКТОП) ---
const scrollContainers = document.querySelectorAll('.horizontal-scroll');
scrollContainers.forEach(container => {
    container.targetScroll = 0;
    container.currentScroll = 0;

    container.addEventListener('wheel', (e) => {
        if(window.innerWidth <= 768) return;
        if (!container.closest('.page').classList.contains('active')) return;
        e.preventDefault();
        container.targetScroll += e.deltaY * 1.5; 
        const maxScroll = container.scrollWidth - container.clientWidth;
        container.targetScroll = Math.max(0, Math.min(container.targetScroll, maxScroll));
    }, { passive: false });

    function smoothScrollLoop() {
        if (window.innerWidth > 768 && container.closest('.page').classList.contains('active')) {
            container.currentScroll += (container.targetScroll - container.currentScroll) * 0.08; 
            container.scrollLeft = container.currentScroll;
        }
        requestAnimationFrame(smoothScrollLoop);
    }
    smoothScrollLoop(); 
});

// --- ФИЛЬТРАЦИЯ ПРОЕКТОВ НА ГЛАВНОЙ ---
function filterProjects(category, btnElement) {
    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => item.style.transitionDelay = '0s');

    items.forEach((item) => {
        const matches = (category === 'all' || item.dataset.category === category);
        if (matches) {
            if (item.timeoutId) clearTimeout(item.timeoutId);
            item.style.display = ''; 
            setTimeout(() => item.classList.remove('filtered-out'), 20);
        } else {
            item.classList.add('filtered-out');
            if (item.timeoutId) clearTimeout(item.timeoutId);
            item.timeoutId = setTimeout(() => item.style.display = 'none', 600);
        }
    });

    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active-filter'));
    if (btnElement) btnElement.classList.add('active-filter');

    const container = document.querySelector('.horizontal-scroll.gallery');
    if (container) { container.targetScroll = 0; container.currentScroll = 0; container.scrollLeft = 0; }
}

// --- АВТОМАТИЧЕСКАЯ КНОПКА "СЛЕДУЮЩИЙ ПРОЕКТ" ---
function nextProject(currentId) {
    const currentItem = document.querySelector(`.gallery-item[data-target="${currentId}"]`);
    if (!currentItem) return;
    
    const category = currentItem.getAttribute('data-category');
    const siblings = Array.from(document.querySelectorAll(`.gallery-item[data-category="${category}"]`));
    const currentIndex = siblings.indexOf(currentItem);
    
    let nextIndex = currentIndex + 1;
    if (nextIndex >= siblings.length) nextIndex = 0; 
    
    const nextTarget = siblings[nextIndex].getAttribute('data-target');
    openPage(nextTarget);
}

// --- ФИЗИКА КОНТАКТОВ (Буквы WYSWYG) ---
let physicsEngine = null;

function createLetterTexture(letter, size, color) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${size * 0.8}px Tektur`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(letter, size / 2, size / 2);
    return canvas.toDataURL(); 
}

function initPhysics() {
    if(physicsEngine) return;
    const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;
    
    physicsEngine = Engine.create();
    const container = document.getElementById('physics-canvas');
    
    const render = Render.create({
        element: container, 
        engine: physicsEngine,
        options: { width: window.innerWidth, height: window.innerHeight, wireframes: false, background: 'transparent' }
    });
    
    const ground = Bodies.rectangle(window.innerWidth/2, window.innerHeight + 50, window.innerWidth, 100, { isStatic: true });
    const wallLeft = Bodies.rectangle(-50, window.innerHeight/2, 100, window.innerHeight, { isStatic: true });
    const wallRight = Bodies.rectangle(window.innerWidth + 50, window.innerHeight/2, 100, window.innerHeight, { isStatic: true });
    
    const contactText = document.querySelector('.contact-text');

    
    const letters = ['W', 'Y', 'S', 'W', 'Y', 'G'];
    const shapes = [];
    
    letters.forEach((char, index) => {
        let size = Math.min(window.innerWidth, window.innerHeight) * 0.6; 
        const minX = window.innerWidth * 0.2; // Левая граница (сдвинута вправо, чтобы не задеть текст)
        const maxX = window.innerWidth - (size / 2); // Правая граница с учетом размера буквы

        let x = minX + Math.random() * (maxX - minX);
        let y = -500 - (Math.random() * 500); 
        
        const isDark = document.body.classList.contains('dark-mode');
        const color = isDark ? '#ffffff' : '#000000'; 
        
        const texture = createLetterTexture(char, size, color);

        shapes.push(Bodies.rectangle(x, y, size * 0.7, size * 0.7, { 
            restitution: 0.6, 
            render: { sprite: { texture: texture } } 
        }));
    });

    const worldBodies = [ground, wallLeft, wallRight, ...shapes];
    
    Composite.add(physicsEngine.world, worldBodies);
    
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(physicsEngine, { 
        mouse: mouse, constraint: { stiffness: 0.2, render: { visible: false } } 
    });
    Composite.add(physicsEngine.world, mouseConstraint);
    render.mouse = mouse;
    
    Render.run(render);
    Runner.run(Runner.create(), physicsEngine);
}

// --- ПЛАВНОЕ ПОЯВЛЕНИЕ КАРТИНОК ПОСЛЕ ЗАГРУЗКИ ---
document.addEventListener("DOMContentLoaded", () => {
    // Находим все картинки на сайте, у которых прописан loading="lazy"
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    
    lazyImages.forEach(img => {
        // Добавляем им стартовую прозрачность (класс lazy-fade)
        img.classList.add('lazy-fade');
        
        // Проверяем: если фото уже закэшировалось и загрузилось моментально
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            // Если фото тяжелое и еще скачивается — ждем окончания скачивания
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
        }
    });
});