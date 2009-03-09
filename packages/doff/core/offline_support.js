/**
 * Soporte para la ida offline y posible la vuelta.
 */


// 
$L('event');


var Modo = type('Modo', {
    // Modes array
    MODES: {
        ONLINE : 0,
	    OFFLINE : 1,
	    ONLINE_TO_OFFLINE : 2,
	    OFFLINE_TO_ONLINE : 3    
    }
}, {
    /**
     * Constructor
     */
    __init__: function (){
        this.mode = Modo.MODES.ONLINE;
        //this.modo = 'Unknown';
    
    },
    /**
     * Convert to string representation
     */
    __str__: function (){ var c;
        return '<Modo %s>'.subs(this.mode_str());
    },
    
    mode_str: function (){
        switch (this.mode){
            case Modo.MODES.ONLINE:
                return 'online';
            case Modo.MODES.OFFLINE:
                return 'offline';
            case Modo.MODES.ONLINE_TO_OFFLINE:
                return 'going offline';
            case Modo.MODES.OFFLINE_TO_ONLINE:
                return 'goning online';
        }
    },
    is_online: function (){ return this.mode == Modo.MODES.ONLINE }    
});

// El modo se mantiene en una instancia de modo,
// esperamos en el futuro poder enviar señales en el cambio
var mode = new Modo();

var OFFLINE_LINK_CACHE = {};
/**
 * Pasa a modo offline.
 * La misión es capturar los links, los forms y las peticiones AJAX.
 * 
 */
function go_offline(){
	if ( ! mode.is_online() )
		return;		// Ya estamos offline o llendonos offline
    mode = MODES.ONLINE_TO_OFFLINE;
	var links = document.getElementsByTagName('a');
	// Desempaquetado de tuplas :)
	for (var [_, link] in Iterator(links)){
		if (link.hasAttributes('href')){
			print(link.href);
		}
		
	}
	mode = MODES.OFFLINE;
}

function go_online(){
    
    
}


$P({'go_offline': go_offline,
    'mode':mode
    }
  );
