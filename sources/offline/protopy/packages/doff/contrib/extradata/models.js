var models = require('doff.db.models.base');

var ExtraData = type('ExtraData', [ models.Model ], {
	name: new models.models.CharField({ max_length: 100 }),
    app_label: new models.CharField({ max_length: 100 }),
    model: new models.models.CharField({ max_length: 100 }),
    data: new models.TextField(),
    
    Meta: {
		db_table = 'doff_extra_data',
		ordering = ['name'],
		unique_together = [[ 'name', 'app_label', 'model' ]]
    }
});

publish({
	ExtraData: ExtraData,
});