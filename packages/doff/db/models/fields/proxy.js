/* "Field-like classes that aren't really fields. It's easier to use objects that have the same attributes as fields sometimes (avoids a lot of special casing)." */
$L('doff.db.models.fields.base', 'IntegerField');

var OrderWrt = type('OrderWrt', IntegerField, {    
    name: '_order',
    attname: '_order',
    column: '_order'
});

publish({ 
    OrderWrt: OrderWrt 
});