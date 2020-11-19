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
  const {
    createNode,
    createParentChildLink
  } = actions;

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



  async function transformObject(obj, id, type) {
    let newContent = await processImages(obj);

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
    const nodeDirectory = path.parse(node.absolutePath).dir
    const absolutePath = path.resolve(path.join(nodeDirectory, image));
    const {
      imageName,
      ext
    } = path.parse(image);
    const fileNode = await createFileNode(
        absolutePath,
        createNodeId,
        {}
    );
    await createNode(fileNode, { name: `gatsby-source-filesystem` });
    return fileNode;
  }

   async function processImages(data, isArray) {
    let retJson;
     (isArray) ? retJson=[]:retJson={};
     for (const entry of Object.entries(data)) {
       const [key, value] = entry;
       const valArray = _.isArray(value);
       if (_.isObject(value)) {
         const newValue = await processImages(value, _.isArray(value));
         (isArray) ? retJson.push(newValue):retJson[key] = newValue;
       } else {
         (isArray) ? retJson.push({[key]: value}):retJson[key] = value;
         if (value.endsWith(".png") || value.endsWith(".jpeg") || value.endsWith(".jpg") || value.endsWith(".webp") || value.endsWith(".tif") || value.endsWith(".tiff") || value.endsWith(".svg")) {
           await createImageNode(value);
         }
       }
     }
     return retJson;
  }


  const content = await loadNodeContent(node);
  let parsedContent;

  try {
    parsedContent = JSON.parse(content);
  } catch {
    const hint = node.absolutePath ? `file ${node.absolutePath}` : `in node ${node.id}`;
    throw new Error(`Unable to parse JSON: ${hint}`);
  }

  if (_.isArray(parsedContent)) {
    for (const obj of parsedContent) {
      let i = parsedContent.indexOf(obj);
      await transformObject(obj, obj.id ? String(obj.id) : createNodeId(`${node.id} [${i}] >>> JSON`), getType({
        node,
        object: obj,
        isArray: true
      }));
    }
  } else if (_.isPlainObject(parsedContent)) {
    await transformObject(parsedContent, parsedContent.id ? String(parsedContent.id) : createNodeId(`${node.id} >>> JSON`), getType({
      node,
      object: parsedContent,
      isArray: false
    }));
  }
}

exports.unstable_shouldOnCreateNode = unstable_shouldOnCreateNode;
exports.onCreateNode = onCreateNode;
