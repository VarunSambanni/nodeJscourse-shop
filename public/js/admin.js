//Client side JS

const deleteProduct = (btn) => {   
    const prodId = btn.parentNode.querySelector('[name=productId]').value ;
    const csrf = btn.parentNode.querySelector('[name=_csrf]').value ;
    const productElement = btn.closest('article') // closest ancestor element 
    fetch('/admin/product/' + prodId, {   // Cant send req body through delete request, so we need to pass the csrf token through req headers
        method: 'DELETE',
        headers: {
            'csrf-token': csrf
        },
    })
    .then(result => {
        return result.json() ;
    })
    .then(data => { // Deleting in the dom
        console.log(data) ;
        productElement.remove() ; 
    })
    .catch(err => {
        console.log(err) ;
    })
} ; 

