const _ = require(`lodash`);
const path = require(`path`)
const { createFileNode } = require(`gatsby-source-filesystem/create-file-node`)


function unstable_shouldOnCreateNode({ node }) {
  // We only care about JSON content.
  return node.internal.mediaType === `application/json`
}

async function onCreateNode(
  { node, actions, loadNodeContent, createNodeId, createContentDigest },
  pluginOptions
) {
  if (!unstable_shouldOnCreateNode({ node })) {
    return
  }

  function getType({ node, object, isArray }) {
    if (pluginOptions && _.isFunction(pluginOptions.typeName)) {
      return pluginOptions.typeName({ node, object, isArray })
    } else if (pluginOptions && _.isString(pluginOptions.typeName)) {
      return pluginOptions.typeName
    } else if (node.internal.type !== `File`) {
      return _.upperFirst(_.camelCase(`${node.internal.type} Json`))
    } else if (isArray) {
      return _.upperFirst(_.camelCase(`${node.name} Json`))
    } else {
      return _.upperFirst(_.camelCase(`${path.basename(node.dir)} Json`))
    }
  }



  function transformObject(obj, id, type) {
    let newContent = processImages(obj);

    const jsonNode = { ...newContent,
      id,
      children: [],
      parent: node.id,
      internal: {
        contentDigest: createContentDigest(newContent),
        type
      }
    };
    createNode(jsonNode);
    createParentChildLink({
      parent: node,
      child: jsonNode
    });
  }

  async function createImageNode(image) {
    let imageNode

    const nodeDirectory = path.parse(node.absolutePath).dir
    const absolutePath = path.resolve(path.join(nodeDirectory, image));
    console.log(`relative path path ` + image);
    console.log(`node path ` + nodeDirectory);
    console.log(`absolutePath path ` + absolutePath);

    const fileNode = await createFileNode(
        absolutePath,
        createNodeId,
        {}
    )
    createNode(fileNode, { name: `gatsby-source-filesystem` })
    imageNode = fileNode
    return imageNode;
  }

   function processImages(data, isArray) {


    if(isArray) {
      let retJson = [];
      Object.entries(data).forEach(entry => {
        const [key, value] = entry;
        if (_.isObject(value)) {
          retJson.push(processImages(value));
        } else {
          let pair = {key: value}
          retJson.push(pair);
          if (value.endsWith(".png") || value.endsWith(".jpeg") || value.endsWith(".jpg") || value.endsWith(".webp") || value.endsWith(".tif") || value.endsWith(".tiff") || value.endsWith(".svg")) {
            const newKey = "JsonizedImage";
            let newPair = {newKey: {}};
            newPair.newKey = createImageNode(value);
            retJson.push(newPair);
          }
        }
      });
      return retJson;
    } else {
      let retJson = {};
      Object.entries(data).forEach(entry => {
        const [key, value] = entry;
        if(_.isArray(value)) {
          retJson[key] = processImages(value, true);
        } else if (_.isObject(value)) {
          retJson[key] = processImages(value);
        } else {
          retJson[key] = value;
          if (value.endsWith(".png") || value.endsWith(".jpeg") || value.endsWith(".jpg") || value.endsWith(".webp") || value.endsWith(".tif") || value.endsWith(".tiff") || value.endsWith(".svg")) {
            const newKey = "JsonizedImage";
            retJson[newKey] = {};
            retJson[newKey]["img"] = createImageNode(value);
          }
        }
      });
      return retJson;
    }
  }

  const {
    createNode,
    createParentChildLink
  } = actions;
  const content = await loadNodeContent(node);
  let parsedContent;

  try {
    parsedContent = JSON.parse(content);
  } catch {
    const hint = node.absolutePath ? `file ${node.absolutePath}` : `in node ${node.id}`;
    throw new Error(`Unable to parse JSON: ${hint}`);
  }

  if (_.isArray(parsedContent)) {
    parsedContent.forEach((obj, i) => {
      transformObject(obj, obj.id ? String(obj.id) : createNodeId(`${node.id} [${i}] >>> JSON`), getType({
        node,
        object: obj,
        isArray: true
      }));
    });
  } else if (_.isPlainObject(parsedContent)) {
    transformObject(parsedContent, parsedContent.id ? String(parsedContent.id) : createNodeId(`${node.id} >>> JSON`), getType({
      node,
      object: parsedContent,
      isArray: false
    }));
  }
}

exports.unstable_shouldOnCreateNode = unstable_shouldOnCreateNode;
exports.onCreateNode = onCreateNode;
