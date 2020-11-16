const _ = require(`lodash`);
const path = require(`path`)

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
    processImages(obj);
    const jsonNode = { ...obj,
      id,
      children: [],
      parent: node.id,
      internal: {
        contentDigest: createContentDigest(obj),
        type
      }
    };
    createNode(jsonNode);
    createParentChildLink({
      parent: node,
      child: jsonNode
    });
  }

  function createImageNode(image, contentType) {
    const {
      imageName,
      ext
    } = path.parse(image);
    const absolutePath = path.normalize(path.join(__dirname, image));
    const data = {
      imageName,
      ext,
      absolutePath,
      extension: ext.substring(1)
    };
    const imageNode = { ...data,
      id: createNodeId(`card-image-${imageName}`),
      internal: {
        type: `jsonImage`,
        contentDigest: createContentDigest(data)
      }
    };
    actions.createNode(imageNode);
    return imageNode;
  }

  function processImages(data) {
    _.forOwn(data, function (key) {
      if (_.isObject(data[key])) {
        processImages(data[key]);
      } else {
        const val = String(data[key]);
        if (val.endsWith(".png") || val.endsWith(".svg") || val.endsWith(".jpeg") || val.endsWith(".jpg")) {
          data[key + "-image"] = createImageNode(val);
        }
      }
    });
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
