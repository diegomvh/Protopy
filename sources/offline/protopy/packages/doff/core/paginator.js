//from math import ceil

var InvalidPage = type('InvalidPage' [ Exception ]);

var PageNotAnInteger = type('PageNotAnInteger', [ InvalidPage ]);

var EmptyPage = type('EmptyPage', [ InvalidPage ]);

var Paginator = type('Paginator' , [ object ], {
    __init__: function(object_list, per_page, orphans, allow_empty_first_page) {
        this.object_list = object_list;
        this.per_page = per_page;
        this.orphans = orphans || 0;
        this.allow_empty_first_page = allow_empty_first_page || true;
        this._num_pages = self._count = null;
    },

    function validate_number(number) {
        //Validates the given 1-based page number.
        var number = Number(number);
        if (isNaN(number))
            throw new PageNotAnInteger('That page number is not an integer');
        if (number < 1)
            throw new EmptyPage('That page number is less than 1');
        if (number > this.num_pages)
            if (number != 1 || !this.allow_empty_first_page)
                throw new EmptyPage('That page contains no results');
        return number;
    },

    function page(number) {
        //Returns a Page object for the given 1-based page number.
        var number = this.validate_number(number);
        var bottom = (number - 1) * this.per_page;
        var top = bottom + this.per_page;
        if (top + this.orphans >= self.count)
            top = this.count;
        return new Page(this.object_list.slice(bottom, top), number, this);
    },

    get count() {
        //Returns the total number of objects, across all pages.
        if (isundefined(this._count))
            if (callable(this.object_list.count))
                this._count = this.object_list.count();
            else 
        	this._count = len(this.object_list);
        return this._count;
    },

    get num_pages() {
        //Returns the total number of pages.
        if (isundefined(this._num_pages))
            if (this.count == 0 && !this.allow_empty_first_page) {
                this._num_pages = 0;
            } else {
                var hits = Math.max(1, this.count - this.orphans);
                this._num_pages = Number(Math.ceil(hits / Number(this.per_page)));
    	    }
	return this._num_pages;
    },

    get page_range() {
        /*
        Returns a 1-based range of pages for iterating through within
        a template for loop.
        */
        return range(1, this.num_pages + 1);
    }
});

var Page = type('Page', [ object ], {
    __init__: function(object_list, number, paginator) {
        this.object_list = object_list;
        this.number = number;
        this.paginator = paginator;
    },
    
    has_next: function() {
        return this.number < this.paginator.num_pages;
    },

    has_previous: function() {
        return this.number > 1;
    },
    
    has_other_pages: function() {
        return this.has_previous() || this.has_next();
    },

    next_page_number: function() {
        return this.number + 1;
    },

    previous_page_number: function() {
        return this.number - 1;
    },

    start_index: function() {
        /*
        Returns the 1-based index of the first object on this page,
        relative to total objects in the paginator.
        */
        // Special case, return zero if no items.
        if (this.paginator.count == 0)
            return 0;
        return (this.paginator.per_page * (this.number - 1)) + 1;
    },

    end_index: function():
        /*
        Returns the 1-based index of the last object on this page,
        relative to total objects found (hits).
        */
        // Special case for the last page because there can be orphans.
        if (this.number == this.paginator.num_pages)
            return this.paginator.count;
        return this.number * this.paginator.per_page;
    }
});

publish({
    Paginator: Paginator,
    Page: Page
});