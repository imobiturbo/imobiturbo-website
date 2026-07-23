document.addEventListener('DOMContentLoaded', () => {

    // 1. FAQ Accordion Logic
    const accordionItems = document.querySelectorAll('.accordion-item');

    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');

        header.addEventListener('click', () => {
            // Close other open items (optional, but good for mobile)
            const currentlyActive = document.querySelector('.accordion-item.active');
            if (currentlyActive && currentlyActive !== item) {
                currentlyActive.classList.remove('active');
            }

            // Toggle current
            item.classList.toggle('active');
        });
    });

    // 2. Sticky Mobile CTA Logic
    const stickyCta = document.querySelector('.sticky-cta');
    const triggerSection = document.getElementById('social-proof');

    if (stickyCta && triggerSection) {
        const handleScroll = () => {
            const triggerBottom = triggerSection.offsetTop + triggerSection.offsetHeight;
            const scrollPosition = window.scrollY + window.innerHeight; // Or just window.scrollY to check top

            // Logic: Show when user scrolls PAST the bottom of the social proof section
            if (window.scrollY > triggerBottom) {
                stickyCta.classList.add('visible');
            } else {
                stickyCta.classList.remove('visible');
            }
        };

        window.addEventListener('scroll', handleScroll);
        // Check initially in case page loads scrolled down
        handleScroll();
    }

    // 3. Smooth Scroll for Anchor Links (polishing)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // 4. Populate Config Data (if any placeholders exist)
    fetch('assets/data/config.json')
        .then(response => response.json())
        .then(config => {
            if (document.querySelector('[data-config="price"]')) {
                document.querySelectorAll('[data-config="price"]').forEach(el => el.textContent = config.price);
            }
        })
        .catch(err => console.log('Config json not found or error', err));

});
