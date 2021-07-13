export const isLengthyArray = (item) => Array.isArray(item) && item.length > 0;

export const inrFormatter = new Intl.NumberFormat('en-us', {
    style: 'currency',
    currency: 'INR'
})