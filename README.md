# gatsby-transformer-json-withimages

Parses raw JSON strings into JavaScript objects e.g. from JSON files. Supports
arrays of objects and single objects. If a node contains a path to an image, the plugin will attempt 
to convert said path into an image with the aid of gatsby-image.


## Install

`npm install gatsby-transformer-json-withimages `

If you want to transform json files, you also need to have `gatsby-transformer-json` installed and configured so it
points to the directory (or directories) you want the json (with images) transformed.



## How to use

In your `gatsby-config.js`:

```javascript
module.exports = {
  plugins: [
    `gatsby-transformer-json-withimages`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: path.join(__dirname, `randomFolder`, `someOtherFolder`, `yetAnotherFolder`,`canBeNestedManyTimes`),
      },
    },
  ],
}
```

## Parsing algorithm

You can choose to structure your data as arrays of objects in individual files
or as single objects spread across multiple files.

### Array of Objects

The algorithm for arrays is to convert each item in the array into a node.

So if your project has a `letters.json` with

```json
[{ "value": "a", "aimg":   "../../yetAnotherFolder/a.jpg"}, { "value": "b" , "bimg": "../../yetAnotherFolder/bimg.png" }, { "value": "c", "imgc": "../../yetAnotherFolder/c_img.svg" }]
```

Then the following three nodes would be created:

```json
[{ "value": "a", "aimg": "../../yetAnotherFolder/a.jpg", "aimg-image":  { gatsby image data } }, { "value": "b" , "imgb": "../../yetAnotherFolder/bb.png", "imgb-image": { gatsby image data } }, { "value": "c", "img_c": "../../yetAnotherFolder/c_img.svg", "img_c-image": { gatsby image data } }]
```

### Single Object

The algorithm for single JSON objects is to convert the object defined at the
root of the file into a node. The type of the node is based on the name of the
parent directory.

For example, let's say your project has a data layout like:

```text
src/
    letters/
        a.json
        b.json
```

Where each of `a.json` and `b.json` look like:

```json
{ 
  "value": "a",
  "aimg": "../../yetAnotherFolder/a.jpg"
}
```

```json
{ 
  "value": "b",
  "imgb": "../../yetAnotherFolder/bb.png"
}
```

```json
{
  "value": "c", 
  "img_c": "../../yetAnotherFolder/c_img.svg"
}
```

Then the following three nodes would be created:

```json
[
  {
    "value": "a",
    "aimg": "../../yetAnotherFolder/a.jpg", 
    "aimg-image":  { 
            gatsby image data 
        }
  },
  {
    "value": "b",
    "imgb": "../../yetAnotherFolder/bb.png", 
    "imgb-image": { 
            gatsby image data 
        }
  },
  {
    "value": "c",
    "img_c": "../../yetAnotherFolder/c_img.svg", 
    "img_c-image": { 
            gatsby image data 
        }
  }
]
```

## How to query

Regardless of whether you choose to structure your data in arrays of objects or
single objects, you'd be able to query your letters like:

```graphql
{
  allLettersJson {
    edges {
      node {
        value
      }
    }
  }
}
```

Which would return:

```javascript
{
  allLettersJson: {
    edges: [
      {
        node: {
          value: "a",
        },
      },
      {
        node: {
          value: "b",
        },
      },
      {
        node: {
          value: "c",
        },
      },
    ]
  }
}
```

## Configuration options

**`typeName`** [string|function][optional]

The default naming convention documented above can be changed with
either a static string value (e.g. to be able to query all json with a
simple query):

```javascript
module.exports = {
  plugins: [
    {
      resolve: `gatsby-transformer-json`,
      options: {
        typeName: `Json`, // a fixed string
      },
    },
  ],
}
```

```graphql
{
  allJson {
    edges {
      node {
        value
      }
    }
  }
}
```

or a function that receives the following arguments:

- `node`: the graphql node that is being processed, e.g. a File node with
  json content
- `object`: a single object (either an item from an array or the whole json content)
- `isArray`: boolean, true if `object` is part of an array

```json
[
  {
    "level": "info",
    "message": "hurray"
  },
  {
    "level": "info",
    "message": "it works"
  },
  {
    "level": "warning",
    "message": "look out"
  }
]
```

```javascript
module.exports = {
  plugins: [
    {
      resolve: `gatsby-transformer-json`,
      options: {
        typeName: ({ node, object, isArray }) => object.level,
      },
    },
  ],
}
```

```graphql
{
  allInfo {
    edges {
      node {
        message
      }
    }
  }
}
```


## Troubleshooting

If some fields are missing or you see the error on build:

> There are conflicting field types in your data. GraphQL schema will omit those fields.

It's probably because you have arrays of mixed values somewhere. For instance:

```json
{
  "stuff": [25, "bob"],
  "orEven": [
    [25, "bob"],
    [23, "joe"]
  ]
}
```

If you can rewrite your data with objects, you should be good to go:

```json
{
  "stuff": [{ "count": 25, "name": "bob" }],
  "orEven": [
    { "count": 25, "name": "bob" },
    { "count": 23, "name": "joe" }
  ]
}
```

Else, if your data doesn't have a consistent schema, like [TopoJSON files](https://en.wikipedia.org/wiki/GeoJSON#TopoJSON), or you can't rewrite it, consider placing the JSON file inside the [`static` folder](/docs/static-folder/#when-to-use-the-static-folder) and use the dynamic import syntax (`import('/static/myjson.json')`) within the `componentDidMount` lifecycle or the `useEffect` hook.
