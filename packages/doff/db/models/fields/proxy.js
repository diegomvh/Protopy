$D("Field-like classes that aren't really fields. It's easier to use objects that have the same attributes as fields sometimes (avoids a lot of special casing).");
$L('doff.db.models.fields.*', 'IntegerField');

var OrderWrt = type('OrderWrt', IntegerField, {    
    name: '_order',
    attname: '_order',
    column: '_order'
});

$D(OrderWrt, "A proxy for the _order database field that is used when Meta.order_with_respect_to is specified.");

$P({ 'OrderWrt': OrderWrt });