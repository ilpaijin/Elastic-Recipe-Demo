var fs = require("fs"),
    es = require("elasticsearch"),
    client = new es.Client({
        host: "localhost:9200"
    });


fs.readFile("recipeitems-latest.json", {
    "encoding": "utf-8"
}, function(err, data) {
    if (err) {
        throw err;
    }

    bulk_request = data.split('\n').reduce(function(bulk_request, line) {

        var obj, recipe;

        try {
            obj = JSON.parse(line);
        } catch (e) {
            console.info("Done reading");
            return bulk_request;
        }

        recipe = {
            id: obj._id.$oid,
            name: obj.name,
            source: obj.source,
            url: obj.url,
            recipeYield: obj.recipeYield,
            ingredients: obj.ingredients,
            prepTime: obj.prepTime,
            cookTime: obj.cookTime,
            datePublished: obj.datePublished,
            description: obj.description
        };

        bulk_request.push({
            index: {
                _index: 'recipes',
                _type: 'recipe',
                id: recipe.id
            }
        });

        bulk_request.push(recipe);

        return bulk_request;

    }, []);

    var busy = false;

    var callback = function(err, resp) {
        if (err) {
            console.info(err);
        }
        busy = false;
    };

    var perhaps_insert = function() {
        if (!busy) {

            busy: true;

            client.bulk({
                body: bulk_request.slice(0, 1000)
            }, callback);

            bulk_request = bulk_request.slice(1000);

            console.info(bulk_request.length);
        }

        if (bulk_request.length > 0) {
            setTimeout(perhaps_insert, 10);
        } else {
            console.info("Inserted all records");
        }
    };

    perhaps_insert();
});