/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

var path = __file__.split('/');
print(path);
path.pop();
path = path.join('/');
var protopy_worker = path + '/protopyWorker.js';

function create_worker(){
    var wp = google.gears.factory.create('beta.workerpool');
    var protopy = wp.createWorkerFromUrl(protopy_worker);
}

publish({
   create_worker: create_worker
})
