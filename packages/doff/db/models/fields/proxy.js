$D("Field-like classes that aren't really fields. It's easier to use objects that have the same attributes as fields sometimes (avoids a lot of special casing).");
$L('doff.db.models.fields', 'IntegerField');

var OrderWrt = type('OrderWrt', IntegerField, {
    __doc__: "A proxy for the _order database field that is used when Meta.order_with_respect_to is specified.",
    name: '_order',
    attname: '_order',
    column: '_order'
});

$P({ 'OrderWrt': OrderWrt });