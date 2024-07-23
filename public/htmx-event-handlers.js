document.body.addEventListener('htmx:sendError', function(e) {
    alert('Network error. Are you online?')
});
document.body.addEventListener('htmx:responseError', function(e) {
    e.detail.shouldSwap = false;
    //e.detail.isError = false;
    alert(e.detail.xhr.responseText || 'Error: unknown');
})
