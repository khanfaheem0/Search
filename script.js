document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const form = document.getElementById('searchForm');
    const enableFiltersCheckbox = document.getElementById('enableFilters');
    const filterFieldsContainer = document.getElementById('filterFields');
    const minReviewsInput = document.getElementById('minReviews');
    const minRatingsInput = document.getElementById('minRatings');
    const startInput = document.getElementById('startParam');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultMessage = document.getElementById('resultMessage');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Toggle Filter Fields Visibility
    function toggleFilterFields() {
        if (enableFiltersCheckbox.checked) {
            filterFieldsContainer.classList.remove('hidden');
            minReviewsInput.setAttribute('required', 'true');
            minRatingsInput.setAttribute('required', 'true');
        } else {
            filterFieldsContainer.classList.add('hidden');
            minReviewsInput.removeAttribute('required');
            minRatingsInput.removeAttribute('required');
            // Optional: clear values when hidden? 
            // The requirement didn't specify, but safer to keep them or clear them.
            // Let's keep them but ignore in validation logic if unchecked.
        }
    }

    // Initial check and event listener
    toggleFilterFields();
    enableFiltersCheckbox.addEventListener('change', toggleFilterFields);

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset messages
        resultMessage.classList.add('hidden');
        resultMessage.className = 'hidden'; // remove success/error classes

        // 1. Validation

        // Validate "Start" - Multiples of 20
        const startValue = parseInt(startInput.value, 10);
        if (isNaN(startValue) || startValue % 20 !== 0) {
            alert('Start value must be a multiple of 20 (e.g., 0, 20, 40).');
            startInput.focus();
            return;
        }

        // Validate "Ratings" - 1 to 5 (only if filters enabled)
        if (enableFiltersCheckbox.checked) {
            const ratingValue = parseFloat(minRatingsInput.value);
            if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
                alert('Minimum Rating must be between 1 and 5.');
                minRatingsInput.focus();
                return;
            }
        }

        // 2. Construct JSON Data
        const formData = new FormData(form);
        const businessString = formData.get('businessName');
        const location = formData.get('location');
        const includeFilters = enableFiltersCheckbox.checked;

        // Split business string by comma and trim whitespace
        const businessTypes = businessString.split(',').map(s => s.trim()).filter(s => s.length > 0);

        const payloadObj = {
            "business_types": businessTypes,
            "location": location,
            "include_filters": includeFilters,
            "Start": startValue
        };

        // Add filter fields if enabled
        if (includeFilters) {
            payloadObj["min_reviews"] = parseInt(formData.get('minReviews'), 10);
            payloadObj["min_ratings"] = parseFloat(formData.get('minRatings'));
        } else {
            // Requirement says output has these fields. If filters disabled, what should they be?
            // The user example shows them included inside the object. 
            // Typically if disabled, we might send null or 0. 
            // However, looking at the user request: "output json ... should look like ..." 
            // and "Enable Filters: Boolean".
            // If Enable Filters is false, presumably we don't care about the values, 
            // but user didn't specify what to send if false.
            // I will include them as null or default 0 to match the structure broadly, 
            // OR omit them. 
            // But wait, user said "Required Field ONLY WHEN Enable Filters is True".
            // This implies if false, they are NOT required.
            // I will send them as null if disabled to keep schema consistent, or omit.
            // Let's send null for clarity if not active. 
            // actually, the example output shows them present.
            // I'll stick to adding them if filters are true. If false, I will omit them to avoid sending junk data.
        }

        const finalPayload = [payloadObj];

        // 3. Send to Webhook
        loadingIndicator.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
            // Webhook URL provided by user
            const webhookUrl = 'https://faheemkhanfida055.app.n8n.cloud/webhook-test/lead-generation';

            console.log("Submitting payload:", JSON.stringify(finalPayload, null, 2));

            // REAL FETCH IMPLEMENTATION:
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(finalPayload)
            });

            if (!response.ok) throw new Error('Webhook failed');

            // Clear the form
            form.reset();
            // Re-apply toggle logic since reset might change checkbox state
            toggleFilterFields();

            resultMessage.innerHTML = 'Success! Data sent (<a href="https://docs.google.com/spreadsheets/d/1eKasmLy4L0PTJgaPPCOKBUHT26zRXUXu8YNQ_wrGktI/edit?usp=sharing" target="_blank" style="color: inherit; text-decoration: underline;">Check CRM</a>)';
            resultMessage.classList.remove('hidden');
            resultMessage.classList.add('success');

        } catch (error) {
            console.error(error);
            resultMessage.textContent = 'Error sending data.';
            resultMessage.classList.remove('hidden');
            resultMessage.classList.add('error');
        } finally {
            loadingIndicator.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });
});
