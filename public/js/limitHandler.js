// Professional Limit Handler with SweetAlert2
function handleFormSubmitWithLimit(formId, buttonId, endpoint, featureName) {
  const form = document.getElementById(formId);
  const button = document.getElementById(buttonId);
  
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams(formData)
      });
      
      const data = await response.json();
      
      if (data.limitReached) {
        if (button) {
          button.disabled = true;
          button.classList.add('btn-secondary');
          button.classList.remove('btn-success', 'btn-dark', 'btn-primary');
        }
        
        Swal.fire({
          icon: 'warning',
          title: 'Limit Reached!',
          html: `<p style="font-size: 16px;">Your ${featureName} limit is completed.</p><p style="font-size: 14px; color: #666;">Please upgrade your plan to add more ${featureName.toLowerCase()}.</p>`,
          confirmButtonText: 'Upgrade Plan',
          confirmButtonColor: '#0033cc',
          showCancelButton: true,
          cancelButtonText: 'Close',
          allowOutsideClick: false
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = '/pricing';
          }
        });
        
        setTimeout(() => { window.location.href = '/pricing'; }, 5000);
      } else if (data.success) {
        window.location.reload();
      } else {
        Swal.fire({icon: 'error', title: 'Error', text: data.message || `Failed to add ${featureName.toLowerCase()}`});
      }
    } catch (error) {
      Swal.fire({icon: 'error', title: 'Error', text: 'Something went wrong. Please try again.'});
    }
  });
}
