"use strict";
var validate = (function () {
  return function validate10(
    data,
    { dataPath = "", parentData, parentDataProperty, rootData = data } = {}
  ) {
    let vErrors = null;
    let errors = 0;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.version === undefined) {
        const err0 = {
          keyword: "required",
          dataPath,
          schemaPath: "#/required",
          params: {
            missingProperty: "version",
          },
          message: "should have required property '" + "version" + "'",
        };
        if (vErrors === null) {
          vErrors = [err0];
        } else {
          vErrors.push(err0);
        }
        errors++;
      }
      if (data.meta === undefined) {
        const err1 = {
          keyword: "required",
          dataPath,
          schemaPath: "#/required",
          params: {
            missingProperty: "meta",
          },
          message: "should have required property '" + "meta" + "'",
        };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
      if (data.tree === undefined) {
        const err2 = {
          keyword: "required",
          dataPath,
          schemaPath: "#/required",
          params: {
            missingProperty: "tree",
          },
          message: "should have required property '" + "tree" + "'",
        };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
      for (const key0 in data) {
        if (!(key0 === "version" || key0 === "meta" || key0 === "tree")) {
          const err3 = {
            keyword: "additionalProperties",
            dataPath,
            schemaPath: "#/additionalProperties",
            params: {
              additionalProperty: key0,
            },
            message: "should NOT have additional properties",
          };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
      }
      if (data.version !== undefined) {
        let data0 = data.version;
        if (typeof data0 === "string") {
          if (!pattern0.test(data0)) {
            const err4 = {
              keyword: "pattern",
              dataPath: dataPath + ".version",
              schemaPath: "#/properties/version/pattern",
              params: {
                pattern: "^v[0-9]+$",
              },
              message: 'should match pattern "' + "^v[0-9]+$" + '"',
            };
            if (vErrors === null) {
              vErrors = [err4];
            } else {
              vErrors.push(err4);
            }
            errors++;
          }
        } else {
          const err5 = {
            keyword: "type",
            dataPath: dataPath + ".version",
            schemaPath: "#/properties/version/type",
            params: {
              type: "string",
            },
            message: "should be string",
          };
          if (vErrors === null) {
            vErrors = [err5];
          } else {
            vErrors.push(err5);
          }
          errors++;
        }
      }
      if (data.meta !== undefined) {
        let data1 = data.meta;
        if (data1 && typeof data1 == "object" && !Array.isArray(data1)) {
          if (data1.updated === undefined) {
            const err6 = {
              keyword: "required",
              dataPath: dataPath + ".meta",
              schemaPath: "#/properties/meta/required",
              params: {
                missingProperty: "updated",
              },
              message: "should have required property '" + "updated" + "'",
            };
            if (vErrors === null) {
              vErrors = [err6];
            } else {
              vErrors.push(err6);
            }
            errors++;
          }
          if (data1.panels === undefined) {
            const err7 = {
              keyword: "required",
              dataPath: dataPath + ".meta",
              schemaPath: "#/properties/meta/required",
              params: {
                missingProperty: "panels",
              },
              message: "should have required property '" + "panels" + "'",
            };
            if (vErrors === null) {
              vErrors = [err7];
            } else {
              vErrors.push(err7);
            }
            errors++;
          }
          for (const key1 in data1) {
            if (!schema27.properties.meta.properties.hasOwnProperty(key1)) {
              const err8 = {
                keyword: "additionalProperties",
                dataPath: dataPath + ".meta",
                schemaPath: "#/properties/meta/additionalProperties",
                params: {
                  additionalProperty: key1,
                },
                message: "should NOT have additional properties",
              };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
          }
          if (data1.title !== undefined) {
            if (typeof data1.title !== "string") {
              const err9 = {
                keyword: "type",
                dataPath: dataPath + ".meta.title",
                schemaPath: "#/properties/meta/properties/title/type",
                params: {
                  type: "string",
                },
                message: "should be string",
              };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
          }
          if (data1.updated !== undefined) {
            let data3 = data1.updated;
            if (typeof data3 === "string") {
              if (!pattern1.test(data3)) {
                const err10 = {
                  keyword: "pattern",
                  dataPath: dataPath + ".meta.updated",
                  schemaPath: "#/properties/meta/properties/updated/pattern",
                  params: {
                    pattern: "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$",
                  },
                  message:
                    'should match pattern "' +
                    "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$" +
                    '"',
                };
                if (vErrors === null) {
                  vErrors = [err10];
                } else {
                  vErrors.push(err10);
                }
                errors++;
              }
            } else {
              const err11 = {
                keyword: "type",
                dataPath: dataPath + ".meta.updated",
                schemaPath: "#/properties/meta/properties/updated/type",
                params: {
                  type: "string",
                },
                message: "should be string",
              };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
          }
          if (data1.build_url !== undefined) {
            if (typeof data1.build_url !== "string") {
              const err12 = {
                keyword: "type",
                dataPath: dataPath + ".meta.build_url",
                schemaPath: "#/properties/meta/properties/build_url/type",
                params: {
                  type: "string",
                },
                message: "should be string",
              };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
          }
          if (data1.description !== undefined) {
            if (typeof data1.description !== "string") {
              const err13 = {
                keyword: "type",
                dataPath: dataPath + ".meta.description",
                schemaPath: "#/properties/meta/properties/description/type",
                params: {
                  type: "string",
                },
                message: "should be string",
              };
              if (vErrors === null) {
                vErrors = [err13];
              } else {
                vErrors.push(err13);
              }
              errors++;
            }
          }
          if (data1.maintainers !== undefined) {
            let data6 = data1.maintainers;
            if (Array.isArray(data6)) {
              if (data6.length < 1) {
                const err14 = {
                  keyword: "minItems",
                  dataPath: dataPath + ".meta.maintainers",
                  schemaPath:
                    "#/properties/meta/properties/maintainers/minItems",
                  params: {
                    limit: 1,
                  },
                  message: "should NOT have fewer than 1 items",
                };
                if (vErrors === null) {
                  vErrors = [err14];
                } else {
                  vErrors.push(err14);
                }
                errors++;
              }
              const len0 = data6.length;
              for (let i0 = 0; i0 < len0; i0++) {
                let data7 = data6[i0];
                if (
                  data7 &&
                  typeof data7 == "object" &&
                  !Array.isArray(data7)
                ) {
                  if (data7.name === undefined) {
                    const err15 = {
                      keyword: "required",
                      dataPath: dataPath + ".meta.maintainers[" + i0 + "]",
                      schemaPath:
                        "#/properties/meta/properties/maintainers/items/required",
                      params: {
                        missingProperty: "name",
                      },
                      message: "should have required property '" + "name" + "'",
                    };
                    if (vErrors === null) {
                      vErrors = [err15];
                    } else {
                      vErrors.push(err15);
                    }
                    errors++;
                  }
                  if (data7.name !== undefined) {
                    if (typeof data7.name !== "string") {
                      const err16 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".meta.maintainers[" + i0 + "].name",
                        schemaPath:
                          "#/properties/meta/properties/maintainers/items/properties/name/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err16];
                      } else {
                        vErrors.push(err16);
                      }
                      errors++;
                    }
                  }
                  if (data7.url !== undefined) {
                    if (typeof data7.url !== "string") {
                      const err17 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".meta.maintainers[" + i0 + "].url",
                        schemaPath:
                          "#/properties/meta/properties/maintainers/items/properties/url/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err17];
                      } else {
                        vErrors.push(err17);
                      }
                      errors++;
                    }
                  }
                } else {
                  const err18 = {
                    keyword: "type",
                    dataPath: dataPath + ".meta.maintainers[" + i0 + "]",
                    schemaPath:
                      "#/properties/meta/properties/maintainers/items/type",
                    params: {
                      type: "object",
                    },
                    message: "should be object",
                  };
                  if (vErrors === null) {
                    vErrors = [err18];
                  } else {
                    vErrors.push(err18);
                  }
                  errors++;
                }
              }
              let i1 = data6.length;
              let j0;
              if (i1 > 1) {
                outer0: for (; i1--; ) {
                  for (j0 = i1; j0--; ) {
                    if (func0(data6[i1], data6[j0])) {
                      const err19 = {
                        keyword: "uniqueItems",
                        dataPath: dataPath + ".meta.maintainers",
                        schemaPath:
                          "#/properties/meta/properties/maintainers/uniqueItems",
                        params: {
                          i: i1,
                          j: j0,
                        },
                        message:
                          "should NOT have duplicate items (items ## " +
                          j0 +
                          " and " +
                          i1 +
                          " are identical)",
                      };
                      if (vErrors === null) {
                        vErrors = [err19];
                      } else {
                        vErrors.push(err19);
                      }
                      errors++;
                      break outer0;
                    }
                  }
                }
              }
            } else {
              const err20 = {
                keyword: "type",
                dataPath: dataPath + ".meta.maintainers",
                schemaPath: "#/properties/meta/properties/maintainers/type",
                params: {
                  type: "array",
                },
                message: "should be array",
              };
              if (vErrors === null) {
                vErrors = [err20];
              } else {
                vErrors.push(err20);
              }
              errors++;
            }
          }
          if (data1.genome_annotations !== undefined) {
            let data10 = data1.genome_annotations;
            if (data10 && typeof data10 == "object" && !Array.isArray(data10)) {
              if (data10.nuc === undefined) {
                const err21 = {
                  keyword: "required",
                  dataPath: dataPath + ".meta.genome_annotations",
                  schemaPath:
                    "#/properties/meta/properties/genome_annotations/required",
                  params: {
                    missingProperty: "nuc",
                  },
                  message: "should have required property '" + "nuc" + "'",
                };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
              for (const key2 in data10) {
                if (!(key2 === "nuc" || pattern2.test(key2))) {
                  const err22 = {
                    keyword: "additionalProperties",
                    dataPath: dataPath + ".meta.genome_annotations",
                    schemaPath:
                      "#/properties/meta/properties/genome_annotations/additionalProperties",
                    params: {
                      additionalProperty: key2,
                    },
                    message: "should NOT have additional properties",
                  };
                  if (vErrors === null) {
                    vErrors = [err22];
                  } else {
                    vErrors.push(err22);
                  }
                  errors++;
                }
              }
              if (data10.nuc !== undefined) {
                let data11 = data10.nuc;
                if (
                  data11 &&
                  typeof data11 == "object" &&
                  !Array.isArray(data11)
                ) {
                  if (data11.seqid !== undefined) {
                    if (typeof data11.seqid !== "string") {
                      const err23 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".meta.genome_annotations.nuc.seqid",
                        schemaPath:
                          "#/properties/meta/properties/genome_annotations/properties/nuc/properties/seqid/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err23];
                      } else {
                        vErrors.push(err23);
                      }
                      errors++;
                    }
                  }
                  if (data11.type !== undefined) {
                    if (typeof data11.type !== "string") {
                      const err24 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".meta.genome_annotations.nuc.type",
                        schemaPath:
                          "#/properties/meta/properties/genome_annotations/properties/nuc/properties/type/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err24];
                      } else {
                        vErrors.push(err24);
                      }
                      errors++;
                    }
                  }
                  if (data11.start !== undefined) {
                    let data14 = data11.start;
                    if (!(typeof data14 == "number" && isFinite(data14))) {
                      const err25 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".meta.genome_annotations.nuc.start",
                        schemaPath:
                          "#/properties/meta/properties/genome_annotations/properties/nuc/properties/start/type",
                        params: {
                          type: "number",
                        },
                        message: "should be number",
                      };
                      if (vErrors === null) {
                        vErrors = [err25];
                      } else {
                        vErrors.push(err25);
                      }
                      errors++;
                    }
                  }
                  if (data11.end !== undefined) {
                    let data15 = data11.end;
                    if (!(typeof data15 == "number" && isFinite(data15))) {
                      const err26 = {
                        keyword: "type",
                        dataPath: dataPath + ".meta.genome_annotations.nuc.end",
                        schemaPath:
                          "#/properties/meta/properties/genome_annotations/properties/nuc/properties/end/type",
                        params: {
                          type: "number",
                        },
                        message: "should be number",
                      };
                      if (vErrors === null) {
                        vErrors = [err26];
                      } else {
                        vErrors.push(err26);
                      }
                      errors++;
                    }
                  }
                  if (data11.strand !== undefined) {
                    let data16 = data11.strand;
                    if (typeof data16 !== "string") {
                      const err27 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".meta.genome_annotations.nuc.strand",
                        schemaPath:
                          "#/properties/meta/properties/genome_annotations/properties/nuc/properties/strand/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err27];
                      } else {
                        vErrors.push(err27);
                      }
                      errors++;
                    }
                    if (!(data16 === "-" || data16 === "+")) {
                      const err28 = {
                        keyword: "enum",
                        dataPath:
                          dataPath + ".meta.genome_annotations.nuc.strand",
                        schemaPath:
                          "#/properties/meta/properties/genome_annotations/properties/nuc/properties/strand/enum",
                        params: {
                          allowedValues:
                            schema27.properties.meta.properties
                              .genome_annotations.properties.nuc.properties
                              .strand.enum,
                        },
                        message: "should be equal to one of the allowed values",
                      };
                      if (vErrors === null) {
                        vErrors = [err28];
                      } else {
                        vErrors.push(err28);
                      }
                      errors++;
                    }
                  }
                } else {
                  const err29 = {
                    keyword: "type",
                    dataPath: dataPath + ".meta.genome_annotations.nuc",
                    schemaPath:
                      "#/properties/meta/properties/genome_annotations/properties/nuc/type",
                    params: {
                      type: "object",
                    },
                    message: "should be object",
                  };
                  if (vErrors === null) {
                    vErrors = [err29];
                  } else {
                    vErrors.push(err29);
                  }
                  errors++;
                }
              }
              for (const key3 in data10) {
                if (pattern2.test(key3)) {
                  let data17 = data10[key3];
                  if (
                    data17 &&
                    typeof data17 == "object" &&
                    !Array.isArray(data17)
                  ) {
                    if (data17.seqid !== undefined) {
                      if (typeof data17.seqid !== "string") {
                        const err30 = {
                          keyword: "type",
                          dataPath:
                            dataPath +
                            ".meta.genome_annotations['" +
                            key3 +
                            "'].seqid",
                          schemaPath:
                            "#/properties/meta/properties/genome_annotations/properties/nuc/properties/seqid/type",
                          params: {
                            type: "string",
                          },
                          message: "should be string",
                        };
                        if (vErrors === null) {
                          vErrors = [err30];
                        } else {
                          vErrors.push(err30);
                        }
                        errors++;
                      }
                    }
                    if (data17.type !== undefined) {
                      if (typeof data17.type !== "string") {
                        const err31 = {
                          keyword: "type",
                          dataPath:
                            dataPath +
                            ".meta.genome_annotations['" +
                            key3 +
                            "'].type",
                          schemaPath:
                            "#/properties/meta/properties/genome_annotations/properties/nuc/properties/type/type",
                          params: {
                            type: "string",
                          },
                          message: "should be string",
                        };
                        if (vErrors === null) {
                          vErrors = [err31];
                        } else {
                          vErrors.push(err31);
                        }
                        errors++;
                      }
                    }
                    if (data17.start !== undefined) {
                      let data20 = data17.start;
                      if (!(typeof data20 == "number" && isFinite(data20))) {
                        const err32 = {
                          keyword: "type",
                          dataPath:
                            dataPath +
                            ".meta.genome_annotations['" +
                            key3 +
                            "'].start",
                          schemaPath:
                            "#/properties/meta/properties/genome_annotations/properties/nuc/properties/start/type",
                          params: {
                            type: "number",
                          },
                          message: "should be number",
                        };
                        if (vErrors === null) {
                          vErrors = [err32];
                        } else {
                          vErrors.push(err32);
                        }
                        errors++;
                      }
                    }
                    if (data17.end !== undefined) {
                      let data21 = data17.end;
                      if (!(typeof data21 == "number" && isFinite(data21))) {
                        const err33 = {
                          keyword: "type",
                          dataPath:
                            dataPath +
                            ".meta.genome_annotations['" +
                            key3 +
                            "'].end",
                          schemaPath:
                            "#/properties/meta/properties/genome_annotations/properties/nuc/properties/end/type",
                          params: {
                            type: "number",
                          },
                          message: "should be number",
                        };
                        if (vErrors === null) {
                          vErrors = [err33];
                        } else {
                          vErrors.push(err33);
                        }
                        errors++;
                      }
                    }
                    if (data17.strand !== undefined) {
                      let data22 = data17.strand;
                      if (typeof data22 !== "string") {
                        const err34 = {
                          keyword: "type",
                          dataPath:
                            dataPath +
                            ".meta.genome_annotations['" +
                            key3 +
                            "'].strand",
                          schemaPath:
                            "#/properties/meta/properties/genome_annotations/properties/nuc/properties/strand/type",
                          params: {
                            type: "string",
                          },
                          message: "should be string",
                        };
                        if (vErrors === null) {
                          vErrors = [err34];
                        } else {
                          vErrors.push(err34);
                        }
                        errors++;
                      }
                      if (!(data22 === "-" || data22 === "+")) {
                        const err35 = {
                          keyword: "enum",
                          dataPath:
                            dataPath +
                            ".meta.genome_annotations['" +
                            key3 +
                            "'].strand",
                          schemaPath:
                            "#/properties/meta/properties/genome_annotations/properties/nuc/properties/strand/enum",
                          params: {
                            allowedValues: schema28.properties.strand.enum,
                          },
                          message:
                            "should be equal to one of the allowed values",
                        };
                        if (vErrors === null) {
                          vErrors = [err35];
                        } else {
                          vErrors.push(err35);
                        }
                        errors++;
                      }
                    }
                  } else {
                    const err36 = {
                      keyword: "type",
                      dataPath:
                        dataPath + ".meta.genome_annotations['" + key3 + "']",
                      schemaPath:
                        "#/properties/meta/properties/genome_annotations/properties/nuc/type",
                      params: {
                        type: "object",
                      },
                      message: "should be object",
                    };
                    if (vErrors === null) {
                      vErrors = [err36];
                    } else {
                      vErrors.push(err36);
                    }
                    errors++;
                  }
                }
              }
            } else {
              const err37 = {
                keyword: "type",
                dataPath: dataPath + ".meta.genome_annotations",
                schemaPath:
                  "#/properties/meta/properties/genome_annotations/type",
                params: {
                  type: "object",
                },
                message: "should be object",
              };
              if (vErrors === null) {
                vErrors = [err37];
              } else {
                vErrors.push(err37);
              }
              errors++;
            }
          }
          if (data1.filters !== undefined) {
            let data23 = data1.filters;
            if (Array.isArray(data23)) {
              const len1 = data23.length;
              for (let i2 = 0; i2 < len1; i2++) {
                if (typeof data23[i2] !== "string") {
                  const err38 = {
                    keyword: "type",
                    dataPath: dataPath + ".meta.filters[" + i2 + "]",
                    schemaPath:
                      "#/properties/meta/properties/filters/items/type",
                    params: {
                      type: "string",
                    },
                    message: "should be string",
                  };
                  if (vErrors === null) {
                    vErrors = [err38];
                  } else {
                    vErrors.push(err38);
                  }
                  errors++;
                }
              }
              let i3 = data23.length;
              let j1;
              if (i3 > 1) {
                const indices0 = {};
                for (; i3--; ) {
                  let item0 = data23[i3];
                  if (typeof item0 !== "string") {
                    continue;
                  }
                  if (typeof indices0[item0] == "number") {
                    j1 = indices0[item0];
                    const err39 = {
                      keyword: "uniqueItems",
                      dataPath: dataPath + ".meta.filters",
                      schemaPath:
                        "#/properties/meta/properties/filters/uniqueItems",
                      params: {
                        i: i3,
                        j: j1,
                      },
                      message:
                        "should NOT have duplicate items (items ## " +
                        j1 +
                        " and " +
                        i3 +
                        " are identical)",
                    };
                    if (vErrors === null) {
                      vErrors = [err39];
                    } else {
                      vErrors.push(err39);
                    }
                    errors++;
                    break;
                  }
                  indices0[item0] = i3;
                }
              }
            } else {
              const err40 = {
                keyword: "type",
                dataPath: dataPath + ".meta.filters",
                schemaPath: "#/properties/meta/properties/filters/type",
                params: {
                  type: "array",
                },
                message: "should be array",
              };
              if (vErrors === null) {
                vErrors = [err40];
              } else {
                vErrors.push(err40);
              }
              errors++;
            }
          }
          if (data1.panels !== undefined) {
            let data25 = data1.panels;
            if (Array.isArray(data25)) {
              if (data25.length < 1) {
                const err41 = {
                  keyword: "minItems",
                  dataPath: dataPath + ".meta.panels",
                  schemaPath: "#/properties/meta/properties/panels/minItems",
                  params: {
                    limit: 1,
                  },
                  message: "should NOT have fewer than 1 items",
                };
                if (vErrors === null) {
                  vErrors = [err41];
                } else {
                  vErrors.push(err41);
                }
                errors++;
              }
              const len2 = data25.length;
              for (let i4 = 0; i4 < len2; i4++) {
                let data26 = data25[i4];
                if (typeof data26 !== "string") {
                  const err42 = {
                    keyword: "type",
                    dataPath: dataPath + ".meta.panels[" + i4 + "]",
                    schemaPath:
                      "#/properties/meta/properties/panels/items/type",
                    params: {
                      type: "string",
                    },
                    message: "should be string",
                  };
                  if (vErrors === null) {
                    vErrors = [err42];
                  } else {
                    vErrors.push(err42);
                  }
                  errors++;
                }
                if (
                  !(
                    data26 === "tree" ||
                    data26 === "map" ||
                    data26 === "frequencies" ||
                    data26 === "entropy"
                  )
                ) {
                  const err43 = {
                    keyword: "enum",
                    dataPath: dataPath + ".meta.panels[" + i4 + "]",
                    schemaPath:
                      "#/properties/meta/properties/panels/items/enum",
                    params: {
                      allowedValues:
                        schema27.properties.meta.properties.panels.items.enum,
                    },
                    message: "should be equal to one of the allowed values",
                  };
                  if (vErrors === null) {
                    vErrors = [err43];
                  } else {
                    vErrors.push(err43);
                  }
                  errors++;
                }
              }
              let i5 = data25.length;
              let j2;
              if (i5 > 1) {
                const indices1 = {};
                for (; i5--; ) {
                  let item1 = data25[i5];
                  if (typeof item1 !== "string") {
                    continue;
                  }
                  if (typeof indices1[item1] == "number") {
                    j2 = indices1[item1];
                    const err44 = {
                      keyword: "uniqueItems",
                      dataPath: dataPath + ".meta.panels",
                      schemaPath:
                        "#/properties/meta/properties/panels/uniqueItems",
                      params: {
                        i: i5,
                        j: j2,
                      },
                      message:
                        "should NOT have duplicate items (items ## " +
                        j2 +
                        " and " +
                        i5 +
                        " are identical)",
                    };
                    if (vErrors === null) {
                      vErrors = [err44];
                    } else {
                      vErrors.push(err44);
                    }
                    errors++;
                    break;
                  }
                  indices1[item1] = i5;
                }
              }
            } else {
              const err45 = {
                keyword: "type",
                dataPath: dataPath + ".meta.panels",
                schemaPath: "#/properties/meta/properties/panels/type",
                params: {
                  type: "array",
                },
                message: "should be array",
              };
              if (vErrors === null) {
                vErrors = [err45];
              } else {
                vErrors.push(err45);
              }
              errors++;
            }
          }
          if (data1.geo_resolutions !== undefined) {
            let data27 = data1.geo_resolutions;
            if (Array.isArray(data27)) {
              if (data27.length < 1) {
                const err46 = {
                  keyword: "minItems",
                  dataPath: dataPath + ".meta.geo_resolutions",
                  schemaPath:
                    "#/properties/meta/properties/geo_resolutions/minItems",
                  params: {
                    limit: 1,
                  },
                  message: "should NOT have fewer than 1 items",
                };
                if (vErrors === null) {
                  vErrors = [err46];
                } else {
                  vErrors.push(err46);
                }
                errors++;
              }
              const len3 = data27.length;
              for (let i6 = 0; i6 < len3; i6++) {
                let data28 = data27[i6];
                if (
                  data28 &&
                  typeof data28 == "object" &&
                  !Array.isArray(data28)
                ) {
                  if (data28.key === undefined) {
                    const err47 = {
                      keyword: "required",
                      dataPath: dataPath + ".meta.geo_resolutions[" + i6 + "]",
                      schemaPath:
                        "#/properties/meta/properties/geo_resolutions/items/required",
                      params: {
                        missingProperty: "key",
                      },
                      message: "should have required property '" + "key" + "'",
                    };
                    if (vErrors === null) {
                      vErrors = [err47];
                    } else {
                      vErrors.push(err47);
                    }
                    errors++;
                  }
                  if (data28.demes === undefined) {
                    const err48 = {
                      keyword: "required",
                      dataPath: dataPath + ".meta.geo_resolutions[" + i6 + "]",
                      schemaPath:
                        "#/properties/meta/properties/geo_resolutions/items/required",
                      params: {
                        missingProperty: "demes",
                      },
                      message:
                        "should have required property '" + "demes" + "'",
                    };
                    if (vErrors === null) {
                      vErrors = [err48];
                    } else {
                      vErrors.push(err48);
                    }
                    errors++;
                  }
                  for (const key4 in data28) {
                    if (
                      !(key4 === "key" || key4 === "title" || key4 === "demes")
                    ) {
                      const err49 = {
                        keyword: "additionalProperties",
                        dataPath:
                          dataPath + ".meta.geo_resolutions[" + i6 + "]",
                        schemaPath:
                          "#/properties/meta/properties/geo_resolutions/items/additionalProperties",
                        params: {
                          additionalProperty: key4,
                        },
                        message: "should NOT have additional properties",
                      };
                      if (vErrors === null) {
                        vErrors = [err49];
                      } else {
                        vErrors.push(err49);
                      }
                      errors++;
                    }
                  }
                  if (data28.key !== undefined) {
                    if (typeof data28.key !== "string") {
                      const err50 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".meta.geo_resolutions[" + i6 + "].key",
                        schemaPath:
                          "#/properties/meta/properties/geo_resolutions/items/properties/key/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err50];
                      } else {
                        vErrors.push(err50);
                      }
                      errors++;
                    }
                  }
                  if (data28.title !== undefined) {
                    if (typeof data28.title !== "string") {
                      const err51 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".meta.geo_resolutions[" + i6 + "].title",
                        schemaPath:
                          "#/properties/meta/properties/geo_resolutions/items/properties/title/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err51];
                      } else {
                        vErrors.push(err51);
                      }
                      errors++;
                    }
                  }
                  if (data28.demes !== undefined) {
                    let data31 = data28.demes;
                    if (
                      data31 &&
                      typeof data31 == "object" &&
                      !Array.isArray(data31)
                    ) {
                      for (const key5 in data31) {
                        if (pattern4.test(key5)) {
                          let data32 = data31[key5];
                          if (
                            data32 &&
                            typeof data32 == "object" &&
                            !Array.isArray(data32)
                          ) {
                            for (const key6 in data32) {
                              if (
                                !(key6 === "latitude" || key6 === "longitude")
                              ) {
                                const err52 = {
                                  keyword: "additionalProperties",
                                  dataPath:
                                    dataPath +
                                    ".meta.geo_resolutions[" +
                                    i6 +
                                    "].demes['" +
                                    key5 +
                                    "']",
                                  schemaPath:
                                    "#/properties/meta/properties/geo_resolutions/items/properties/demes/patternProperties/%5E%5Ba-z_%5D%2B%24/additionalProperties",
                                  params: {
                                    additionalProperty: key6,
                                  },
                                  message:
                                    "should NOT have additional properties",
                                };
                                if (vErrors === null) {
                                  vErrors = [err52];
                                } else {
                                  vErrors.push(err52);
                                }
                                errors++;
                              }
                            }
                            if (data32.latitude !== undefined) {
                              let data33 = data32.latitude;
                              if (
                                typeof data33 == "number" &&
                                isFinite(data33)
                              ) {
                                if (data33 > 90 || isNaN(data33)) {
                                  const err53 = {
                                    keyword: "maximum",
                                    dataPath:
                                      dataPath +
                                      ".meta.geo_resolutions[" +
                                      i6 +
                                      "].demes['" +
                                      key5 +
                                      "'].latitude",
                                    schemaPath:
                                      "#/properties/meta/properties/geo_resolutions/items/properties/demes/patternProperties/%5E%5Ba-z_%5D%2B%24/properties/latitude/maximum",
                                    params: {
                                      comparison: "<=",
                                      limit: 90,
                                    },
                                    message: "should be <= 90",
                                  };
                                  if (vErrors === null) {
                                    vErrors = [err53];
                                  } else {
                                    vErrors.push(err53);
                                  }
                                  errors++;
                                }
                                if (data33 < -90 || isNaN(data33)) {
                                  const err54 = {
                                    keyword: "minimum",
                                    dataPath:
                                      dataPath +
                                      ".meta.geo_resolutions[" +
                                      i6 +
                                      "].demes['" +
                                      key5 +
                                      "'].latitude",
                                    schemaPath:
                                      "#/properties/meta/properties/geo_resolutions/items/properties/demes/patternProperties/%5E%5Ba-z_%5D%2B%24/properties/latitude/minimum",
                                    params: {
                                      comparison: ">=",
                                      limit: -90,
                                    },
                                    message: "should be >= -90",
                                  };
                                  if (vErrors === null) {
                                    vErrors = [err54];
                                  } else {
                                    vErrors.push(err54);
                                  }
                                  errors++;
                                }
                              } else {
                                const err55 = {
                                  keyword: "type",
                                  dataPath:
                                    dataPath +
                                    ".meta.geo_resolutions[" +
                                    i6 +
                                    "].demes['" +
                                    key5 +
                                    "'].latitude",
                                  schemaPath:
                                    "#/properties/meta/properties/geo_resolutions/items/properties/demes/patternProperties/%5E%5Ba-z_%5D%2B%24/properties/latitude/type",
                                  params: {
                                    type: "number",
                                  },
                                  message: "should be number",
                                };
                                if (vErrors === null) {
                                  vErrors = [err55];
                                } else {
                                  vErrors.push(err55);
                                }
                                errors++;
                              }
                            }
                            if (data32.longitude !== undefined) {
                              let data34 = data32.longitude;
                              if (
                                typeof data34 == "number" &&
                                isFinite(data34)
                              ) {
                                if (data34 > 180 || isNaN(data34)) {
                                  const err56 = {
                                    keyword: "maximum",
                                    dataPath:
                                      dataPath +
                                      ".meta.geo_resolutions[" +
                                      i6 +
                                      "].demes['" +
                                      key5 +
                                      "'].longitude",
                                    schemaPath:
                                      "#/properties/meta/properties/geo_resolutions/items/properties/demes/patternProperties/%5E%5Ba-z_%5D%2B%24/properties/longitude/maximum",
                                    params: {
                                      comparison: "<=",
                                      limit: 180,
                                    },
                                    message: "should be <= 180",
                                  };
                                  if (vErrors === null) {
                                    vErrors = [err56];
                                  } else {
                                    vErrors.push(err56);
                                  }
                                  errors++;
                                }
                                if (data34 < -180 || isNaN(data34)) {
                                  const err57 = {
                                    keyword: "minimum",
                                    dataPath:
                                      dataPath +
                                      ".meta.geo_resolutions[" +
                                      i6 +
                                      "].demes['" +
                                      key5 +
                                      "'].longitude",
                                    schemaPath:
                                      "#/properties/meta/properties/geo_resolutions/items/properties/demes/patternProperties/%5E%5Ba-z_%5D%2B%24/properties/longitude/minimum",
                                    params: {
                                      comparison: ">=",
                                      limit: -180,
                                    },
                                    message: "should be >= -180",
                                  };
                                  if (vErrors === null) {
                                    vErrors = [err57];
                                  } else {
                                    vErrors.push(err57);
                                  }
                                  errors++;
                                }
                              } else {
                                const err58 = {
                                  keyword: "type",
                                  dataPath:
                                    dataPath +
                                    ".meta.geo_resolutions[" +
                                    i6 +
                                    "].demes['" +
                                    key5 +
                                    "'].longitude",
                                  schemaPath:
                                    "#/properties/meta/properties/geo_resolutions/items/properties/demes/patternProperties/%5E%5Ba-z_%5D%2B%24/properties/longitude/type",
                                  params: {
                                    type: "number",
                                  },
                                  message: "should be number",
                                };
                                if (vErrors === null) {
                                  vErrors = [err58];
                                } else {
                                  vErrors.push(err58);
                                }
                                errors++;
                              }
                            }
                          } else {
                            const err59 = {
                              keyword: "type",
                              dataPath:
                                dataPath +
                                ".meta.geo_resolutions[" +
                                i6 +
                                "].demes['" +
                                key5 +
                                "']",
                              schemaPath:
                                "#/properties/meta/properties/geo_resolutions/items/properties/demes/patternProperties/%5E%5Ba-z_%5D%2B%24/type",
                              params: {
                                type: "object",
                              },
                              message: "should be object",
                            };
                            if (vErrors === null) {
                              vErrors = [err59];
                            } else {
                              vErrors.push(err59);
                            }
                            errors++;
                          }
                        }
                      }
                    } else {
                      const err60 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".meta.geo_resolutions[" + i6 + "].demes",
                        schemaPath:
                          "#/properties/meta/properties/geo_resolutions/items/properties/demes/type",
                        params: {
                          type: "object",
                        },
                        message: "should be object",
                      };
                      if (vErrors === null) {
                        vErrors = [err60];
                      } else {
                        vErrors.push(err60);
                      }
                      errors++;
                    }
                  }
                } else {
                  const err61 = {
                    keyword: "type",
                    dataPath: dataPath + ".meta.geo_resolutions[" + i6 + "]",
                    schemaPath:
                      "#/properties/meta/properties/geo_resolutions/items/type",
                    params: {
                      type: "object",
                    },
                    message: "should be object",
                  };
                  if (vErrors === null) {
                    vErrors = [err61];
                  } else {
                    vErrors.push(err61);
                  }
                  errors++;
                }
              }
            } else {
              const err62 = {
                keyword: "type",
                dataPath: dataPath + ".meta.geo_resolutions",
                schemaPath: "#/properties/meta/properties/geo_resolutions/type",
                params: {
                  type: "array",
                },
                message: "should be array",
              };
              if (vErrors === null) {
                vErrors = [err62];
              } else {
                vErrors.push(err62);
              }
              errors++;
            }
          }
          if (data1.colorings !== undefined) {
            let data35 = data1.colorings;
            if (Array.isArray(data35)) {
              if (data35.length < 1) {
                const err63 = {
                  keyword: "minItems",
                  dataPath: dataPath + ".meta.colorings",
                  schemaPath: "#/properties/meta/properties/colorings/minItems",
                  params: {
                    limit: 1,
                  },
                  message: "should NOT have fewer than 1 items",
                };
                if (vErrors === null) {
                  vErrors = [err63];
                } else {
                  vErrors.push(err63);
                }
                errors++;
              }
              const len4 = data35.length;
              for (let i7 = 0; i7 < len4; i7++) {
                let data36 = data35[i7];
                if (
                  data36 &&
                  typeof data36 == "object" &&
                  !Array.isArray(data36)
                ) {
                  if (data36.key === undefined) {
                    const err64 = {
                      keyword: "required",
                      dataPath: dataPath + ".meta.colorings[" + i7 + "]",
                      schemaPath:
                        "#/properties/meta/properties/colorings/items/required",
                      params: {
                        missingProperty: "key",
                      },
                      message: "should have required property '" + "key" + "'",
                    };
                    if (vErrors === null) {
                      vErrors = [err64];
                    } else {
                      vErrors.push(err64);
                    }
                    errors++;
                  }
                  if (data36.type === undefined) {
                    const err65 = {
                      keyword: "required",
                      dataPath: dataPath + ".meta.colorings[" + i7 + "]",
                      schemaPath:
                        "#/properties/meta/properties/colorings/items/required",
                      params: {
                        missingProperty: "type",
                      },
                      message: "should have required property '" + "type" + "'",
                    };
                    if (vErrors === null) {
                      vErrors = [err65];
                    } else {
                      vErrors.push(err65);
                    }
                    errors++;
                  }
                  if (data36.key !== undefined) {
                    if (typeof data36.key !== "string") {
                      const err66 = {
                        keyword: "type",
                        dataPath: dataPath + ".meta.colorings[" + i7 + "].key",
                        schemaPath:
                          "#/properties/meta/properties/colorings/items/properties/key/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err66];
                      } else {
                        vErrors.push(err66);
                      }
                      errors++;
                    }
                  }
                  if (data36.title !== undefined) {
                    if (typeof data36.title !== "string") {
                      const err67 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".meta.colorings[" + i7 + "].title",
                        schemaPath:
                          "#/properties/meta/properties/colorings/items/properties/title/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err67];
                      } else {
                        vErrors.push(err67);
                      }
                      errors++;
                    }
                  }
                  if (data36.type !== undefined) {
                    let data39 = data36.type;
                    if (typeof data39 !== "string") {
                      const err68 = {
                        keyword: "type",
                        dataPath: dataPath + ".meta.colorings[" + i7 + "].type",
                        schemaPath:
                          "#/properties/meta/properties/colorings/items/properties/type/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err68];
                      } else {
                        vErrors.push(err68);
                      }
                      errors++;
                    }
                    if (
                      !(
                        data39 === "continuous" ||
                        data39 === "ordinal" ||
                        data39 === "categorical" ||
                        data39 === "boolean"
                      )
                    ) {
                      const err69 = {
                        keyword: "enum",
                        dataPath: dataPath + ".meta.colorings[" + i7 + "].type",
                        schemaPath:
                          "#/properties/meta/properties/colorings/items/properties/type/enum",
                        params: {
                          allowedValues:
                            schema27.properties.meta.properties.colorings.items
                              .properties.type.enum,
                        },
                        message: "should be equal to one of the allowed values",
                      };
                      if (vErrors === null) {
                        vErrors = [err69];
                      } else {
                        vErrors.push(err69);
                      }
                      errors++;
                    }
                  }
                  if (data36.scale !== undefined) {
                    let data40 = data36.scale;
                    if (Array.isArray(data40)) {
                      const len5 = data40.length;
                      for (let i8 = 0; i8 < len5; i8++) {
                        let data41 = data40[i8];
                        if (Array.isArray(data41)) {
                          const len6 = data41.length;
                          if (len6 > 0) {
                            if (typeof data41[0] !== "string") {
                              const err70 = {
                                keyword: "type",
                                dataPath:
                                  dataPath +
                                  ".meta.colorings[" +
                                  i7 +
                                  "].scale[" +
                                  i8 +
                                  "][0]",
                                schemaPath:
                                  "#/properties/meta/properties/colorings/items/properties/scale/items/items/0/type",
                                params: {
                                  type: "string",
                                },
                                message: "should be string",
                              };
                              if (vErrors === null) {
                                vErrors = [err70];
                              } else {
                                vErrors.push(err70);
                              }
                              errors++;
                            }
                          }
                          if (len6 > 1) {
                            let data43 = data41[1];
                            if (typeof data43 === "string") {
                              if (!pattern5.test(data43)) {
                                const err71 = {
                                  keyword: "pattern",
                                  dataPath:
                                    dataPath +
                                    ".meta.colorings[" +
                                    i7 +
                                    "].scale[" +
                                    i8 +
                                    "][1]",
                                  schemaPath:
                                    "#/properties/meta/properties/colorings/items/properties/scale/items/items/1/pattern",
                                  params: {
                                    pattern: "^#[0-9A-Fa-f]{6}$",
                                  },
                                  message:
                                    'should match pattern "' +
                                    "^#[0-9A-Fa-f]{6}$" +
                                    '"',
                                };
                                if (vErrors === null) {
                                  vErrors = [err71];
                                } else {
                                  vErrors.push(err71);
                                }
                                errors++;
                              }
                            } else {
                              const err72 = {
                                keyword: "type",
                                dataPath:
                                  dataPath +
                                  ".meta.colorings[" +
                                  i7 +
                                  "].scale[" +
                                  i8 +
                                  "][1]",
                                schemaPath:
                                  "#/properties/meta/properties/colorings/items/properties/scale/items/items/1/type",
                                params: {
                                  type: "string",
                                },
                                message: "should be string",
                              };
                              if (vErrors === null) {
                                vErrors = [err72];
                              } else {
                                vErrors.push(err72);
                              }
                              errors++;
                            }
                          }
                        } else {
                          const err73 = {
                            keyword: "type",
                            dataPath:
                              dataPath +
                              ".meta.colorings[" +
                              i7 +
                              "].scale[" +
                              i8 +
                              "]",
                            schemaPath:
                              "#/properties/meta/properties/colorings/items/properties/scale/items/type",
                            params: {
                              type: "array",
                            },
                            message: "should be array",
                          };
                          if (vErrors === null) {
                            vErrors = [err73];
                          } else {
                            vErrors.push(err73);
                          }
                          errors++;
                        }
                      }
                    } else {
                      const err74 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".meta.colorings[" + i7 + "].scale",
                        schemaPath:
                          "#/properties/meta/properties/colorings/items/properties/scale/type",
                        params: {
                          type: "array",
                        },
                        message: "should be array",
                      };
                      if (vErrors === null) {
                        vErrors = [err74];
                      } else {
                        vErrors.push(err74);
                      }
                      errors++;
                    }
                  }
                } else {
                  const err75 = {
                    keyword: "type",
                    dataPath: dataPath + ".meta.colorings[" + i7 + "]",
                    schemaPath:
                      "#/properties/meta/properties/colorings/items/type",
                    params: {
                      type: "object",
                    },
                    message: "should be object",
                  };
                  if (vErrors === null) {
                    vErrors = [err75];
                  } else {
                    vErrors.push(err75);
                  }
                  errors++;
                }
              }
            } else {
              const err76 = {
                keyword: "type",
                dataPath: dataPath + ".meta.colorings",
                schemaPath: "#/properties/meta/properties/colorings/type",
                params: {
                  type: "array",
                },
                message: "should be array",
              };
              if (vErrors === null) {
                vErrors = [err76];
              } else {
                vErrors.push(err76);
              }
              errors++;
            }
          }
          if (data1.display_defaults !== undefined) {
            let data44 = data1.display_defaults;
            if (data44 && typeof data44 == "object" && !Array.isArray(data44)) {
              for (const key7 in data44) {
                if (
                  !(
                    key7 === "geo_resolution" ||
                    key7 === "color_by" ||
                    key7 === "distance_measure" ||
                    key7 === "layout" ||
                    key7 === "map_triplicate" ||
                    key7 === "branch_label" ||
                    key7 === "transmission_lines"
                  )
                ) {
                  const err77 = {
                    keyword: "additionalProperties",
                    dataPath: dataPath + ".meta.display_defaults",
                    schemaPath:
                      "#/properties/meta/properties/display_defaults/additionalProperties",
                    params: {
                      additionalProperty: key7,
                    },
                    message: "should NOT have additional properties",
                  };
                  if (vErrors === null) {
                    vErrors = [err77];
                  } else {
                    vErrors.push(err77);
                  }
                  errors++;
                }
              }
              if (data44.geo_resolution !== undefined) {
                if (typeof data44.geo_resolution !== "string") {
                  const err78 = {
                    keyword: "type",
                    dataPath:
                      dataPath + ".meta.display_defaults.geo_resolution",
                    schemaPath:
                      "#/properties/meta/properties/display_defaults/properties/geo_resolution/type",
                    params: {
                      type: "string",
                    },
                    message: "should be string",
                  };
                  if (vErrors === null) {
                    vErrors = [err78];
                  } else {
                    vErrors.push(err78);
                  }
                  errors++;
                }
              }
              if (data44.color_by !== undefined) {
                if (typeof data44.color_by !== "string") {
                  const err79 = {
                    keyword: "type",
                    dataPath: dataPath + ".meta.display_defaults.color_by",
                    schemaPath:
                      "#/properties/meta/properties/display_defaults/properties/color_by/type",
                    params: {
                      type: "string",
                    },
                    message: "should be string",
                  };
                  if (vErrors === null) {
                    vErrors = [err79];
                  } else {
                    vErrors.push(err79);
                  }
                  errors++;
                }
              }
              if (data44.distance_measure !== undefined) {
                let data47 = data44.distance_measure;
                if (typeof data47 !== "string") {
                  const err80 = {
                    keyword: "type",
                    dataPath:
                      dataPath + ".meta.display_defaults.distance_measure",
                    schemaPath:
                      "#/properties/meta/properties/display_defaults/properties/distance_measure/type",
                    params: {
                      type: "string",
                    },
                    message: "should be string",
                  };
                  if (vErrors === null) {
                    vErrors = [err80];
                  } else {
                    vErrors.push(err80);
                  }
                  errors++;
                }
                if (!(data47 === "div" || data47 === "num_date")) {
                  const err81 = {
                    keyword: "enum",
                    dataPath:
                      dataPath + ".meta.display_defaults.distance_measure",
                    schemaPath:
                      "#/properties/meta/properties/display_defaults/properties/distance_measure/enum",
                    params: {
                      allowedValues:
                        schema27.properties.meta.properties.display_defaults
                          .properties.distance_measure.enum,
                    },
                    message: "should be equal to one of the allowed values",
                  };
                  if (vErrors === null) {
                    vErrors = [err81];
                  } else {
                    vErrors.push(err81);
                  }
                  errors++;
                }
              }
              if (data44.layout !== undefined) {
                let data48 = data44.layout;
                if (typeof data48 !== "string") {
                  const err82 = {
                    keyword: "type",
                    dataPath: dataPath + ".meta.display_defaults.layout",
                    schemaPath:
                      "#/properties/meta/properties/display_defaults/properties/layout/type",
                    params: {
                      type: "string",
                    },
                    message: "should be string",
                  };
                  if (vErrors === null) {
                    vErrors = [err82];
                  } else {
                    vErrors.push(err82);
                  }
                  errors++;
                }
                if (
                  !(
                    data48 === "rect" ||
                    data48 === "radial" ||
                    data48 === "unrooted" ||
                    data48 === "clock"
                  )
                ) {
                  const err83 = {
                    keyword: "enum",
                    dataPath: dataPath + ".meta.display_defaults.layout",
                    schemaPath:
                      "#/properties/meta/properties/display_defaults/properties/layout/enum",
                    params: {
                      allowedValues:
                        schema27.properties.meta.properties.display_defaults
                          .properties.layout.enum,
                    },
                    message: "should be equal to one of the allowed values",
                  };
                  if (vErrors === null) {
                    vErrors = [err83];
                  } else {
                    vErrors.push(err83);
                  }
                  errors++;
                }
              }
              if (data44.map_triplicate !== undefined) {
                if (typeof data44.map_triplicate !== "boolean") {
                  const err84 = {
                    keyword: "type",
                    dataPath:
                      dataPath + ".meta.display_defaults.map_triplicate",
                    schemaPath:
                      "#/properties/meta/properties/display_defaults/properties/map_triplicate/type",
                    params: {
                      type: "boolean",
                    },
                    message: "should be boolean",
                  };
                  if (vErrors === null) {
                    vErrors = [err84];
                  } else {
                    vErrors.push(err84);
                  }
                  errors++;
                }
              }
              if (data44.branch_label !== undefined) {
                if (typeof data44.branch_label !== "string") {
                  const err85 = {
                    keyword: "type",
                    dataPath: dataPath + ".meta.display_defaults.branch_label",
                    schemaPath:
                      "#/properties/meta/properties/display_defaults/properties/branch_label/type",
                    params: {
                      type: "string",
                    },
                    message: "should be string",
                  };
                  if (vErrors === null) {
                    vErrors = [err85];
                  } else {
                    vErrors.push(err85);
                  }
                  errors++;
                }
              }
              if (data44.transmission_lines !== undefined) {
                if (typeof data44.transmission_lines !== "boolean") {
                  const err86 = {
                    keyword: "type",
                    dataPath:
                      dataPath + ".meta.display_defaults.transmission_lines",
                    schemaPath:
                      "#/properties/meta/properties/display_defaults/properties/transmission_lines/type",
                    params: {
                      type: "boolean",
                    },
                    message: "should be boolean",
                  };
                  if (vErrors === null) {
                    vErrors = [err86];
                  } else {
                    vErrors.push(err86);
                  }
                  errors++;
                }
              }
            } else {
              const err87 = {
                keyword: "type",
                dataPath: dataPath + ".meta.display_defaults",
                schemaPath:
                  "#/properties/meta/properties/display_defaults/type",
                params: {
                  type: "object",
                },
                message: "should be object",
              };
              if (vErrors === null) {
                vErrors = [err87];
              } else {
                vErrors.push(err87);
              }
              errors++;
            }
          }
          if (data1.tree_name !== undefined) {
            if (typeof data1.tree_name !== "string") {
              const err88 = {
                keyword: "type",
                dataPath: dataPath + ".meta.tree_name",
                schemaPath: "#/properties/meta/properties/tree_name/type",
                params: {
                  type: "string",
                },
                message: "should be string",
              };
              if (vErrors === null) {
                vErrors = [err88];
              } else {
                vErrors.push(err88);
              }
              errors++;
            }
          }
        } else {
          const err89 = {
            keyword: "type",
            dataPath: dataPath + ".meta",
            schemaPath: "#/properties/meta/type",
            params: {
              type: "object",
            },
            message: "should be object",
          };
          if (vErrors === null) {
            vErrors = [err89];
          } else {
            vErrors.push(err89);
          }
          errors++;
        }
      }
      if (data.tree !== undefined) {
        let data53 = data.tree;
        if (data53 && typeof data53 == "object" && !Array.isArray(data53)) {
          if (data53.name === undefined) {
            const err90 = {
              keyword: "required",
              dataPath: dataPath + ".tree",
              schemaPath: "#/properties/tree/required",
              params: {
                missingProperty: "name",
              },
              message: "should have required property '" + "name" + "'",
            };
            if (vErrors === null) {
              vErrors = [err90];
            } else {
              vErrors.push(err90);
            }
            errors++;
          }
          for (const key8 in data53) {
            if (
              !(
                key8 === "name" ||
                key8 === "node_attrs" ||
                key8 === "branch_attrs" ||
                key8 === "children"
              )
            ) {
              const err91 = {
                keyword: "additionalProperties",
                dataPath: dataPath + ".tree",
                schemaPath: "#/properties/tree/additionalProperties",
                params: {
                  additionalProperty: key8,
                },
                message: "should NOT have additional properties",
              };
              if (vErrors === null) {
                vErrors = [err91];
              } else {
                vErrors.push(err91);
              }
              errors++;
            }
          }
          if (data53.name !== undefined) {
            if (typeof data53.name !== "string") {
              const err92 = {
                keyword: "type",
                dataPath: dataPath + ".tree.name",
                schemaPath: "#/properties/tree/properties/name/type",
                params: {
                  type: "string",
                },
                message: "should be string",
              };
              if (vErrors === null) {
                vErrors = [err92];
              } else {
                vErrors.push(err92);
              }
              errors++;
            }
          }
          if (data53.node_attrs !== undefined) {
            let data55 = data53.node_attrs;
            if (data55 && typeof data55 == "object" && !Array.isArray(data55)) {
              if (data55.div !== undefined) {
                let data56 = data55.div;
                if (!(typeof data56 == "number" && isFinite(data56))) {
                  const err93 = {
                    keyword: "type",
                    dataPath: dataPath + ".tree.node_attrs.div",
                    schemaPath:
                      "#/properties/tree/properties/node_attrs/properties/div/type",
                    params: {
                      type: "number",
                    },
                    message: "should be number",
                  };
                  if (vErrors === null) {
                    vErrors = [err93];
                  } else {
                    vErrors.push(err93);
                  }
                  errors++;
                }
              }
              if (data55.num_date !== undefined) {
                let data57 = data55.num_date;
                if (
                  data57 &&
                  typeof data57 == "object" &&
                  !Array.isArray(data57)
                ) {
                  if (data57.value === undefined) {
                    const err94 = {
                      keyword: "required",
                      dataPath: dataPath + ".tree.node_attrs.num_date",
                      schemaPath:
                        "#/properties/tree/properties/node_attrs/properties/num_date/required",
                      params: {
                        missingProperty: "value",
                      },
                      message:
                        "should have required property '" + "value" + "'",
                    };
                    if (vErrors === null) {
                      vErrors = [err94];
                    } else {
                      vErrors.push(err94);
                    }
                    errors++;
                  }
                  if (data57.value !== undefined) {
                    let data58 = data57.value;
                    if (!(typeof data58 == "number" && isFinite(data58))) {
                      const err95 = {
                        keyword: "type",
                        dataPath: dataPath + ".tree.node_attrs.num_date.value",
                        schemaPath:
                          "#/properties/tree/properties/node_attrs/properties/num_date/properties/value/type",
                        params: {
                          type: "number",
                        },
                        message: "should be number",
                      };
                      if (vErrors === null) {
                        vErrors = [err95];
                      } else {
                        vErrors.push(err95);
                      }
                      errors++;
                    }
                  }
                  if (data57.confidence !== undefined) {
                    let data59 = data57.confidence;
                    if (Array.isArray(data59)) {
                      const len7 = data59.length;
                      if (len7 > 0) {
                        let data60 = data59[0];
                        if (!(typeof data60 == "number" && isFinite(data60))) {
                          const err96 = {
                            keyword: "type",
                            dataPath:
                              dataPath +
                              ".tree.node_attrs.num_date.confidence[0]",
                            schemaPath:
                              "#/properties/tree/properties/node_attrs/properties/num_date/properties/confidence/items/0/type",
                            params: {
                              type: "number",
                            },
                            message: "should be number",
                          };
                          if (vErrors === null) {
                            vErrors = [err96];
                          } else {
                            vErrors.push(err96);
                          }
                          errors++;
                        }
                      }
                      if (len7 > 1) {
                        let data61 = data59[1];
                        if (!(typeof data61 == "number" && isFinite(data61))) {
                          const err97 = {
                            keyword: "type",
                            dataPath:
                              dataPath +
                              ".tree.node_attrs.num_date.confidence[1]",
                            schemaPath:
                              "#/properties/tree/properties/node_attrs/properties/num_date/properties/confidence/items/1/type",
                            params: {
                              type: "number",
                            },
                            message: "should be number",
                          };
                          if (vErrors === null) {
                            vErrors = [err97];
                          } else {
                            vErrors.push(err97);
                          }
                          errors++;
                        }
                      }
                    } else {
                      const err98 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".tree.node_attrs.num_date.confidence",
                        schemaPath:
                          "#/properties/tree/properties/node_attrs/properties/num_date/properties/confidence/type",
                        params: {
                          type: "array",
                        },
                        message: "should be array",
                      };
                      if (vErrors === null) {
                        vErrors = [err98];
                      } else {
                        vErrors.push(err98);
                      }
                      errors++;
                    }
                  }
                } else {
                  const err99 = {
                    keyword: "type",
                    dataPath: dataPath + ".tree.node_attrs.num_date",
                    schemaPath:
                      "#/properties/tree/properties/node_attrs/properties/num_date/type",
                    params: {
                      type: "object",
                    },
                    message: "should be object",
                  };
                  if (vErrors === null) {
                    vErrors = [err99];
                  } else {
                    vErrors.push(err99);
                  }
                  errors++;
                }
              }
              if (data55.vaccine !== undefined) {
                let data62 = data55.vaccine;
                if (
                  data62 &&
                  typeof data62 == "object" &&
                  !Array.isArray(data62)
                ) {
                  if (data62.serum !== undefined) {
                    if (typeof data62.serum !== "boolean") {
                      const err100 = {
                        keyword: "type",
                        dataPath: dataPath + ".tree.node_attrs.vaccine.serum",
                        schemaPath:
                          "#/properties/tree/properties/node_attrs/properties/vaccine/properties/serum/type",
                        params: {
                          type: "boolean",
                        },
                        message: "should be boolean",
                      };
                      if (vErrors === null) {
                        vErrors = [err100];
                      } else {
                        vErrors.push(err100);
                      }
                      errors++;
                    }
                  }
                  if (data62.selection_date !== undefined) {
                    let data64 = data62.selection_date;
                    if (typeof data64 === "string") {
                      if (!pattern1.test(data64)) {
                        const err101 = {
                          keyword: "pattern",
                          dataPath:
                            dataPath +
                            ".tree.node_attrs.vaccine.selection_date",
                          schemaPath:
                            "#/properties/tree/properties/node_attrs/properties/vaccine/properties/selection_date/pattern",
                          params: {
                            pattern: "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$",
                          },
                          message:
                            'should match pattern "' +
                            "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$" +
                            '"',
                        };
                        if (vErrors === null) {
                          vErrors = [err101];
                        } else {
                          vErrors.push(err101);
                        }
                        errors++;
                      }
                    } else {
                      const err102 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".tree.node_attrs.vaccine.selection_date",
                        schemaPath:
                          "#/properties/tree/properties/node_attrs/properties/vaccine/properties/selection_date/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err102];
                      } else {
                        vErrors.push(err102);
                      }
                      errors++;
                    }
                  }
                  if (data62.start_date !== undefined) {
                    let data65 = data62.start_date;
                    if (typeof data65 === "string") {
                      if (!pattern1.test(data65)) {
                        const err103 = {
                          keyword: "pattern",
                          dataPath:
                            dataPath + ".tree.node_attrs.vaccine.start_date",
                          schemaPath:
                            "#/properties/tree/properties/node_attrs/properties/vaccine/properties/start_date/pattern",
                          params: {
                            pattern: "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$",
                          },
                          message:
                            'should match pattern "' +
                            "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$" +
                            '"',
                        };
                        if (vErrors === null) {
                          vErrors = [err103];
                        } else {
                          vErrors.push(err103);
                        }
                        errors++;
                      }
                    } else {
                      const err104 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".tree.node_attrs.vaccine.start_date",
                        schemaPath:
                          "#/properties/tree/properties/node_attrs/properties/vaccine/properties/start_date/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err104];
                      } else {
                        vErrors.push(err104);
                      }
                      errors++;
                    }
                  }
                  if (data62.end_date !== undefined) {
                    let data66 = data62.end_date;
                    if (typeof data66 === "string") {
                      if (!pattern1.test(data66)) {
                        const err105 = {
                          keyword: "pattern",
                          dataPath:
                            dataPath + ".tree.node_attrs.vaccine.end_date",
                          schemaPath:
                            "#/properties/tree/properties/node_attrs/properties/vaccine/properties/end_date/pattern",
                          params: {
                            pattern: "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$",
                          },
                          message:
                            'should match pattern "' +
                            "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$" +
                            '"',
                        };
                        if (vErrors === null) {
                          vErrors = [err105];
                        } else {
                          vErrors.push(err105);
                        }
                        errors++;
                      }
                    } else {
                      const err106 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".tree.node_attrs.vaccine.end_date",
                        schemaPath:
                          "#/properties/tree/properties/node_attrs/properties/vaccine/properties/end_date/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err106];
                      } else {
                        vErrors.push(err106);
                      }
                      errors++;
                    }
                  }
                }
              }
              if (data55.hidden !== undefined) {
                let data67 = data55.hidden;
                if (typeof data67 !== "string") {
                  const err107 = {
                    keyword: "type",
                    dataPath: dataPath + ".tree.node_attrs.hidden",
                    schemaPath:
                      "#/properties/tree/properties/node_attrs/properties/hidden/type",
                    params: {
                      type: "string",
                    },
                    message: "should be string",
                  };
                  if (vErrors === null) {
                    vErrors = [err107];
                  } else {
                    vErrors.push(err107);
                  }
                  errors++;
                }
                if (
                  !(
                    data67 === "always" ||
                    data67 === "timetree" ||
                    data67 === "divtree"
                  )
                ) {
                  const err108 = {
                    keyword: "enum",
                    dataPath: dataPath + ".tree.node_attrs.hidden",
                    schemaPath:
                      "#/properties/tree/properties/node_attrs/properties/hidden/enum",
                    params: {
                      allowedValues:
                        schema27.properties.tree.properties.node_attrs
                          .properties.hidden.enum,
                    },
                    message: "should be equal to one of the allowed values",
                  };
                  if (vErrors === null) {
                    vErrors = [err108];
                  } else {
                    vErrors.push(err108);
                  }
                  errors++;
                }
              }
              if (data55.url !== undefined) {
                let data68 = data55.url;
                if (typeof data68 === "string") {
                  if (!pattern9.test(data68)) {
                    const err109 = {
                      keyword: "pattern",
                      dataPath: dataPath + ".tree.node_attrs.url",
                      schemaPath:
                        "#/properties/tree/properties/node_attrs/properties/url/pattern",
                      params: {
                        pattern: "^https?://.+$",
                      },
                      message: 'should match pattern "' + "^https?://.+$" + '"',
                    };
                    if (vErrors === null) {
                      vErrors = [err109];
                    } else {
                      vErrors.push(err109);
                    }
                    errors++;
                  }
                } else {
                  const err110 = {
                    keyword: "type",
                    dataPath: dataPath + ".tree.node_attrs.url",
                    schemaPath:
                      "#/properties/tree/properties/node_attrs/properties/url/type",
                    params: {
                      type: "string",
                    },
                    message: "should be string",
                  };
                  if (vErrors === null) {
                    vErrors = [err110];
                  } else {
                    vErrors.push(err110);
                  }
                  errors++;
                }
              }
              if (data55.author !== undefined) {
                let data69 = data55.author;
                if (
                  data69 &&
                  typeof data69 == "object" &&
                  !Array.isArray(data69)
                ) {
                  if (data69.value === undefined) {
                    const err111 = {
                      keyword: "required",
                      dataPath: dataPath + ".tree.node_attrs.author",
                      schemaPath:
                        "#/properties/tree/properties/node_attrs/properties/author/required",
                      params: {
                        missingProperty: "value",
                      },
                      message:
                        "should have required property '" + "value" + "'",
                    };
                    if (vErrors === null) {
                      vErrors = [err111];
                    } else {
                      vErrors.push(err111);
                    }
                    errors++;
                  }
                  if (data69.value !== undefined) {
                    if (typeof data69.value !== "string") {
                      const err112 = {
                        keyword: "type",
                        dataPath: dataPath + ".tree.node_attrs.author.value",
                        schemaPath:
                          "#/properties/tree/properties/node_attrs/properties/author/properties/value/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err112];
                      } else {
                        vErrors.push(err112);
                      }
                      errors++;
                    }
                  }
                  if (data69.title !== undefined) {
                    if (typeof data69.title !== "string") {
                      const err113 = {
                        keyword: "type",
                        dataPath: dataPath + ".tree.node_attrs.author.title",
                        schemaPath:
                          "#/properties/tree/properties/node_attrs/properties/author/properties/title/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err113];
                      } else {
                        vErrors.push(err113);
                      }
                      errors++;
                    }
                  }
                  if (data69.journal !== undefined) {
                    if (typeof data69.journal !== "string") {
                      const err114 = {
                        keyword: "type",
                        dataPath: dataPath + ".tree.node_attrs.author.journal",
                        schemaPath:
                          "#/properties/tree/properties/node_attrs/properties/author/properties/journal/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err114];
                      } else {
                        vErrors.push(err114);
                      }
                      errors++;
                    }
                  }
                  if (data69.paper_url !== undefined) {
                    let data73 = data69.paper_url;
                    if (typeof data73 === "string") {
                      if (!pattern9.test(data73)) {
                        const err115 = {
                          keyword: "pattern",
                          dataPath:
                            dataPath + ".tree.node_attrs.author.paper_url",
                          schemaPath:
                            "#/properties/tree/properties/node_attrs/properties/author/properties/paper_url/pattern",
                          params: {
                            pattern: "^https?://.+$",
                          },
                          message:
                            'should match pattern "' + "^https?://.+$" + '"',
                        };
                        if (vErrors === null) {
                          vErrors = [err115];
                        } else {
                          vErrors.push(err115);
                        }
                        errors++;
                      }
                    } else {
                      const err116 = {
                        keyword: "type",
                        dataPath:
                          dataPath + ".tree.node_attrs.author.paper_url",
                        schemaPath:
                          "#/properties/tree/properties/node_attrs/properties/author/properties/paper_url/type",
                        params: {
                          type: "string",
                        },
                        message: "should be string",
                      };
                      if (vErrors === null) {
                        vErrors = [err116];
                      } else {
                        vErrors.push(err116);
                      }
                      errors++;
                    }
                  }
                } else {
                  const err117 = {
                    keyword: "type",
                    dataPath: dataPath + ".tree.node_attrs.author",
                    schemaPath:
                      "#/properties/tree/properties/node_attrs/properties/author/type",
                    params: {
                      type: "object",
                    },
                    message: "should be object",
                  };
                  if (vErrors === null) {
                    vErrors = [err117];
                  } else {
                    vErrors.push(err117);
                  }
                  errors++;
                }
              }
              if (data55.accession !== undefined) {
                let data74 = data55.accession;
                if (typeof data74 === "string") {
                  if (!pattern11.test(data74)) {
                    const err118 = {
                      keyword: "pattern",
                      dataPath: dataPath + ".tree.node_attrs.accession",
                      schemaPath:
                        "#/properties/tree/properties/node_attrs/properties/accession/pattern",
                      params: {
                        pattern: "^[0-9A-Za-z-_]+$",
                      },
                      message:
                        'should match pattern "' + "^[0-9A-Za-z-_]+$" + '"',
                    };
                    if (vErrors === null) {
                      vErrors = [err118];
                    } else {
                      vErrors.push(err118);
                    }
                    errors++;
                  }
                } else {
                  const err119 = {
                    keyword: "type",
                    dataPath: dataPath + ".tree.node_attrs.accession",
                    schemaPath:
                      "#/properties/tree/properties/node_attrs/properties/accession/type",
                    params: {
                      type: "string",
                    },
                    message: "should be string",
                  };
                  if (vErrors === null) {
                    vErrors = [err119];
                  } else {
                    vErrors.push(err119);
                  }
                  errors++;
                }
              }
              for (const key9 in data55) {
                if (pattern12.test(key9)) {
                  let data75 = data55[key9];
                  if (
                    data75 &&
                    typeof data75 == "object" &&
                    !Array.isArray(data75)
                  ) {
                    if (data75.value === undefined) {
                      const err120 = {
                        keyword: "required",
                        dataPath: dataPath + ".tree.node_attrs['" + key9 + "']",
                        schemaPath:
                          "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/required",
                        params: {
                          missingProperty: "value",
                        },
                        message:
                          "should have required property '" + "value" + "'",
                      };
                      if (vErrors === null) {
                        vErrors = [err120];
                      } else {
                        vErrors.push(err120);
                      }
                      errors++;
                    }
                    if (data75.value !== undefined) {
                      let data76 = data75.value;
                      if (
                        typeof data76 !== "string" &&
                        !(typeof data76 == "number" && isFinite(data76)) &&
                        typeof data76 !== "boolean"
                      ) {
                        const err121 = {
                          keyword: "type",
                          dataPath:
                            dataPath + ".tree.node_attrs['" + key9 + "'].value",
                          schemaPath:
                            "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/properties/value/type",
                          params: {
                            type:
                              schema27.properties.tree.properties.node_attrs
                                .patternProperties[
                                "(?!div|num_date|vaccine|hidden|url|author|accession)(^.+$)"
                              ].properties.value.type,
                          },
                          message: "should be string,number,boolean",
                        };
                        if (vErrors === null) {
                          vErrors = [err121];
                        } else {
                          vErrors.push(err121);
                        }
                        errors++;
                      }
                    }
                    if (data75.confidence !== undefined) {
                      let data77 = data75.confidence;
                      const _errs86 = errors;
                      let valid31 = false;
                      let passing0 = null;
                      const _errs87 = errors;
                      if (Array.isArray(data77)) {
                        const len8 = data77.length;
                        if (len8 > 0) {
                          let data78 = data77[0];
                          if (
                            !(typeof data78 == "number" && isFinite(data78))
                          ) {
                            const err122 = {
                              keyword: "type",
                              dataPath:
                                dataPath +
                                ".tree.node_attrs['" +
                                key9 +
                                "'].confidence[0]",
                              schemaPath:
                                "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/properties/confidence/oneOf/0/items/0/type",
                              params: {
                                type: "number",
                              },
                              message: "should be number",
                            };
                            if (vErrors === null) {
                              vErrors = [err122];
                            } else {
                              vErrors.push(err122);
                            }
                            errors++;
                          }
                        }
                        if (len8 > 1) {
                          let data79 = data77[1];
                          if (
                            !(typeof data79 == "number" && isFinite(data79))
                          ) {
                            const err123 = {
                              keyword: "type",
                              dataPath:
                                dataPath +
                                ".tree.node_attrs['" +
                                key9 +
                                "'].confidence[1]",
                              schemaPath:
                                "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/properties/confidence/oneOf/0/items/1/type",
                              params: {
                                type: "number",
                              },
                              message: "should be number",
                            };
                            if (vErrors === null) {
                              vErrors = [err123];
                            } else {
                              vErrors.push(err123);
                            }
                            errors++;
                          }
                        }
                      } else {
                        const err124 = {
                          keyword: "type",
                          dataPath:
                            dataPath +
                            ".tree.node_attrs['" +
                            key9 +
                            "'].confidence",
                          schemaPath:
                            "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/properties/confidence/oneOf/0/type",
                          params: {
                            type: "array",
                          },
                          message: "should be array",
                        };
                        if (vErrors === null) {
                          vErrors = [err124];
                        } else {
                          vErrors.push(err124);
                        }
                        errors++;
                      }
                      var _valid0 = _errs87 === errors;
                      if (_valid0) {
                        valid31 = true;
                        passing0 = 0;
                      }
                      const _errs90 = errors;
                      if (
                        data77 &&
                        typeof data77 == "object" &&
                        !Array.isArray(data77)
                      ) {
                        for (const key10 in data77) {
                          if (pattern13.test(key10)) {
                            let data80 = data77[key10];
                            if (typeof data80 == "number" && isFinite(data80)) {
                              if (data80 > 1 || isNaN(data80)) {
                                const err125 = {
                                  keyword: "maximum",
                                  dataPath:
                                    dataPath +
                                    ".tree.node_attrs['" +
                                    key9 +
                                    "'].confidence['" +
                                    key10 +
                                    "']",
                                  schemaPath:
                                    "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/properties/confidence/oneOf/1/patternProperties/%5E.%2B%24/maximum",
                                  params: {
                                    comparison: "<=",
                                    limit: 1,
                                  },
                                  message: "should be <= 1",
                                };
                                if (vErrors === null) {
                                  vErrors = [err125];
                                } else {
                                  vErrors.push(err125);
                                }
                                errors++;
                              }
                              if (data80 < 0 || isNaN(data80)) {
                                const err126 = {
                                  keyword: "minimum",
                                  dataPath:
                                    dataPath +
                                    ".tree.node_attrs['" +
                                    key9 +
                                    "'].confidence['" +
                                    key10 +
                                    "']",
                                  schemaPath:
                                    "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/properties/confidence/oneOf/1/patternProperties/%5E.%2B%24/minimum",
                                  params: {
                                    comparison: ">=",
                                    limit: 0,
                                  },
                                  message: "should be >= 0",
                                };
                                if (vErrors === null) {
                                  vErrors = [err126];
                                } else {
                                  vErrors.push(err126);
                                }
                                errors++;
                              }
                            } else {
                              const err127 = {
                                keyword: "type",
                                dataPath:
                                  dataPath +
                                  ".tree.node_attrs['" +
                                  key9 +
                                  "'].confidence['" +
                                  key10 +
                                  "']",
                                schemaPath:
                                  "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/properties/confidence/oneOf/1/patternProperties/%5E.%2B%24/type",
                                params: {
                                  type: "number",
                                },
                                message: "should be number",
                              };
                              if (vErrors === null) {
                                vErrors = [err127];
                              } else {
                                vErrors.push(err127);
                              }
                              errors++;
                            }
                          }
                        }
                      } else {
                        const err128 = {
                          keyword: "type",
                          dataPath:
                            dataPath +
                            ".tree.node_attrs['" +
                            key9 +
                            "'].confidence",
                          schemaPath:
                            "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/properties/confidence/oneOf/1/type",
                          params: {
                            type: "object",
                          },
                          message: "should be object",
                        };
                        if (vErrors === null) {
                          vErrors = [err128];
                        } else {
                          vErrors.push(err128);
                        }
                        errors++;
                      }
                      var _valid0 = _errs90 === errors;
                      if (_valid0 && valid31) {
                        valid31 = false;
                        passing0 = [passing0, 1];
                      } else {
                        if (_valid0) {
                          valid31 = true;
                          passing0 = 1;
                        }
                      }
                      if (!valid31) {
                        const err129 = {
                          keyword: "oneOf",
                          dataPath:
                            dataPath +
                            ".tree.node_attrs['" +
                            key9 +
                            "'].confidence",
                          schemaPath:
                            "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/properties/confidence/oneOf",
                          params: {
                            passingSchemas: passing0,
                          },
                          message: "should match exactly one schema in oneOf",
                        };
                        if (vErrors === null) {
                          vErrors = [err129];
                        } else {
                          vErrors.push(err129);
                        }
                        errors++;
                      } else {
                        errors = _errs86;
                        if (vErrors !== null) {
                          if (_errs86) {
                            vErrors.length = _errs86;
                          } else {
                            vErrors = null;
                          }
                        }
                      }
                    }
                    if (data75.entropy !== undefined) {
                      let data81 = data75.entropy;
                      if (!(typeof data81 == "number" && isFinite(data81))) {
                        const err130 = {
                          keyword: "type",
                          dataPath:
                            dataPath +
                            ".tree.node_attrs['" +
                            key9 +
                            "'].entropy",
                          schemaPath:
                            "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/properties/entropy/type",
                          params: {
                            type: "number",
                          },
                          message: "should be number",
                        };
                        if (vErrors === null) {
                          vErrors = [err130];
                        } else {
                          vErrors.push(err130);
                        }
                        errors++;
                      }
                    }
                  } else {
                    const err131 = {
                      keyword: "type",
                      dataPath: dataPath + ".tree.node_attrs['" + key9 + "']",
                      schemaPath:
                        "#/properties/tree/properties/node_attrs/patternProperties/(%3F!div%7Cnum_date%7Cvaccine%7Chidden%7Curl%7Cauthor%7Caccession)(%5E.%2B%24)/type",
                      params: {
                        type: "object",
                      },
                      message: "should be object",
                    };
                    if (vErrors === null) {
                      vErrors = [err131];
                    } else {
                      vErrors.push(err131);
                    }
                    errors++;
                  }
                }
              }
            } else {
              const err132 = {
                keyword: "type",
                dataPath: dataPath + ".tree.node_attrs",
                schemaPath: "#/properties/tree/properties/node_attrs/type",
                params: {
                  type: "object",
                },
                message: "should be object",
              };
              if (vErrors === null) {
                vErrors = [err132];
              } else {
                vErrors.push(err132);
              }
              errors++;
            }
          }
          if (data53.branch_attrs !== undefined) {
            let data82 = data53.branch_attrs;
            if (data82 && typeof data82 == "object" && !Array.isArray(data82)) {
              if (data82.labels !== undefined) {
                let data83 = data82.labels;
                if (
                  data83 &&
                  typeof data83 == "object" &&
                  !Array.isArray(data83)
                ) {
                  for (const key11 in data83) {
                    if (pattern14.test(key11)) {
                      if (typeof data83[key11] !== "string") {
                        const err133 = {
                          keyword: "type",
                          dataPath:
                            dataPath +
                            ".tree.branch_attrs.labels['" +
                            key11 +
                            "']",
                          schemaPath:
                            "#/properties/tree/properties/branch_attrs/properties/labels/patternProperties/%5E%5Ba-zA-Z0-9%5D%2B%24/type",
                          params: {
                            type: "string",
                          },
                          message: "should be string",
                        };
                        if (vErrors === null) {
                          vErrors = [err133];
                        } else {
                          vErrors.push(err133);
                        }
                        errors++;
                      }
                    }
                  }
                }
              }
              if (data82.mutations !== undefined) {
                let data85 = data82.mutations;
                if (
                  data85 &&
                  typeof data85 == "object" &&
                  !Array.isArray(data85)
                ) {
                  for (const key12 in data85) {
                    if (!(key12 === "nuc" || pattern15.test(key12))) {
                      const err134 = {
                        keyword: "additionalProperties",
                        dataPath: dataPath + ".tree.branch_attrs.mutations",
                        schemaPath:
                          "#/properties/tree/properties/branch_attrs/properties/mutations/additionalProperties",
                        params: {
                          additionalProperty: key12,
                        },
                        message: "should NOT have additional properties",
                      };
                      if (vErrors === null) {
                        vErrors = [err134];
                      } else {
                        vErrors.push(err134);
                      }
                      errors++;
                    }
                  }
                  if (data85.nuc !== undefined) {
                    let data86 = data85.nuc;
                    if (Array.isArray(data86)) {
                      const len9 = data86.length;
                      for (let i9 = 0; i9 < len9; i9++) {
                        let data87 = data86[i9];
                        const _errs100 = errors;
                        let valid38 = false;
                        let passing1 = null;
                        const _errs101 = errors;
                        if (typeof data87 === "string") {
                          if (!pattern16.test(data87)) {
                            const err135 = {
                              keyword: "pattern",
                              dataPath:
                                dataPath +
                                ".tree.branch_attrs.mutations.nuc[" +
                                i9 +
                                "]",
                              schemaPath:
                                "#/properties/tree/properties/branch_attrs/properties/mutations/properties/nuc/items/oneOf/0/pattern",
                              params: {
                                pattern:
                                  "^[ATCGNYRWSKMDVHB-][0-9]+[ATCGNYRWSKMDVHB-]$",
                              },
                              message:
                                'should match pattern "' +
                                "^[ATCGNYRWSKMDVHB-][0-9]+[ATCGNYRWSKMDVHB-]$" +
                                '"',
                            };
                            if (vErrors === null) {
                              vErrors = [err135];
                            } else {
                              vErrors.push(err135);
                            }
                            errors++;
                          }
                        } else {
                          const err136 = {
                            keyword: "type",
                            dataPath:
                              dataPath +
                              ".tree.branch_attrs.mutations.nuc[" +
                              i9 +
                              "]",
                            schemaPath:
                              "#/properties/tree/properties/branch_attrs/properties/mutations/properties/nuc/items/oneOf/0/type",
                            params: {
                              type: "string",
                            },
                            message: "should be string",
                          };
                          if (vErrors === null) {
                            vErrors = [err136];
                          } else {
                            vErrors.push(err136);
                          }
                          errors++;
                        }
                        var _valid1 = _errs101 === errors;
                        if (_valid1) {
                          valid38 = true;
                          passing1 = 0;
                        }
                        if (!valid38) {
                          const err137 = {
                            keyword: "oneOf",
                            dataPath:
                              dataPath +
                              ".tree.branch_attrs.mutations.nuc[" +
                              i9 +
                              "]",
                            schemaPath:
                              "#/properties/tree/properties/branch_attrs/properties/mutations/properties/nuc/items/oneOf",
                            params: {
                              passingSchemas: passing1,
                            },
                            message: "should match exactly one schema in oneOf",
                          };
                          if (vErrors === null) {
                            vErrors = [err137];
                          } else {
                            vErrors.push(err137);
                          }
                          errors++;
                        } else {
                          errors = _errs100;
                          if (vErrors !== null) {
                            if (_errs100) {
                              vErrors.length = _errs100;
                            } else {
                              vErrors = null;
                            }
                          }
                        }
                      }
                    } else {
                      const err138 = {
                        keyword: "type",
                        dataPath: dataPath + ".tree.branch_attrs.mutations.nuc",
                        schemaPath:
                          "#/properties/tree/properties/branch_attrs/properties/mutations/properties/nuc/type",
                        params: {
                          type: "array",
                        },
                        message: "should be array",
                      };
                      if (vErrors === null) {
                        vErrors = [err138];
                      } else {
                        vErrors.push(err138);
                      }
                      errors++;
                    }
                  }
                  for (const key13 in data85) {
                    if (pattern15.test(key13)) {
                      let data88 = data85[key13];
                      if (Array.isArray(data88)) {
                        const len10 = data88.length;
                        for (let i10 = 0; i10 < len10; i10++) {
                          let data89 = data88[i10];
                          if (typeof data89 === "string") {
                            if (!pattern18.test(data89)) {
                              const err139 = {
                                keyword: "pattern",
                                dataPath:
                                  dataPath +
                                  ".tree.branch_attrs.mutations['" +
                                  key13 +
                                  "'][" +
                                  i10 +
                                  "]",
                                schemaPath:
                                  "#/properties/tree/properties/branch_attrs/properties/mutations/patternProperties/%5E%5Ba-zA-Z0-9_-%5D%2B%24/items/pattern",
                                params: {
                                  pattern: "^[A-Z*-][0-9]+[A-Z*-]$",
                                },
                                message:
                                  'should match pattern "' +
                                  "^[A-Z*-][0-9]+[A-Z*-]$" +
                                  '"',
                              };
                              if (vErrors === null) {
                                vErrors = [err139];
                              } else {
                                vErrors.push(err139);
                              }
                              errors++;
                            }
                          }
                        }
                      } else {
                        const err140 = {
                          keyword: "type",
                          dataPath:
                            dataPath +
                            ".tree.branch_attrs.mutations['" +
                            key13 +
                            "']",
                          schemaPath:
                            "#/properties/tree/properties/branch_attrs/properties/mutations/patternProperties/%5E%5Ba-zA-Z0-9_-%5D%2B%24/type",
                          params: {
                            type: "array",
                          },
                          message: "should be array",
                        };
                        if (vErrors === null) {
                          vErrors = [err140];
                        } else {
                          vErrors.push(err140);
                        }
                        errors++;
                      }
                    }
                  }
                } else {
                  const err141 = {
                    keyword: "type",
                    dataPath: dataPath + ".tree.branch_attrs.mutations",
                    schemaPath:
                      "#/properties/tree/properties/branch_attrs/properties/mutations/type",
                    params: {
                      type: "object",
                    },
                    message: "should be object",
                  };
                  if (vErrors === null) {
                    vErrors = [err141];
                  } else {
                    vErrors.push(err141);
                  }
                  errors++;
                }
              }
            } else {
              const err142 = {
                keyword: "type",
                dataPath: dataPath + ".tree.branch_attrs",
                schemaPath: "#/properties/tree/properties/branch_attrs/type",
                params: {
                  type: "object",
                },
                message: "should be object",
              };
              if (vErrors === null) {
                vErrors = [err142];
              } else {
                vErrors.push(err142);
              }
              errors++;
            }
          }
          if (data53.children !== undefined) {
            let data90 = data53.children;
            if (Array.isArray(data90)) {
              if (data90.length < 1) {
                const err143 = {
                  keyword: "minItems",
                  dataPath: dataPath + ".tree.children",
                  schemaPath: "#/properties/tree/properties/children/minItems",
                  params: {
                    limit: 1,
                  },
                  message: "should NOT have fewer than 1 items",
                };
                if (vErrors === null) {
                  vErrors = [err143];
                } else {
                  vErrors.push(err143);
                }
                errors++;
              }
              const len11 = data90.length;
              for (let i11 = 0; i11 < len11; i11++) {
                if (
                  !validate11(data90[i11], {
                    dataPath: dataPath + ".tree.children[" + i11 + "]",
                    parentData: data90,
                    parentDataProperty: i11,
                    rootData,
                  })
                ) {
                  vErrors =
                    vErrors === null
                      ? validate11.errors
                      : vErrors.concat(validate11.errors);
                  errors = vErrors.length;
                }
              }
            } else {
              const err144 = {
                keyword: "type",
                dataPath: dataPath + ".tree.children",
                schemaPath: "#/properties/tree/properties/children/type",
                params: {
                  type: "array",
                },
                message: "should be array",
              };
              if (vErrors === null) {
                vErrors = [err144];
              } else {
                vErrors.push(err144);
              }
              errors++;
            }
          }
        } else {
          const err145 = {
            keyword: "type",
            dataPath: dataPath + ".tree",
            schemaPath: "#/properties/tree/type",
            params: {
              type: "object",
            },
            message: "should be object",
          };
          if (vErrors === null) {
            vErrors = [err145];
          } else {
            vErrors.push(err145);
          }
          errors++;
        }
      }
    } else {
      const err146 = {
        keyword: "type",
        dataPath,
        schemaPath: "#/type",
        params: {
          type: "object",
        },
        message: "should be object",
      };
      if (vErrors === null) {
        vErrors = [err146];
      } else {
        vErrors.push(err146);
      }
      errors++;
    }
    validate10.errors = vErrors;
    return errors === 0;
  };
})();
validate.schema = {
  type: "object",
  $schema: "http://json-schema.org/draft-07/schema",
  title: "Nextstrain metadata JSON schema proposal (meta + tree together)",
  additionalProperties: false,
  required: ["version", "meta", "tree"],
  properties: {
    version: {
      description: "JSON schema version",
      type: "string",
      pattern: "^v[0-9]+$",
    },
    meta: {
      type: "object",
      additionalProperties: false,
      required: ["updated", "panels"],
      properties: {
        title: {
          description: "Auspice displays this at the top of the page",
          type: "string",
        },
        updated: {
          description: "Auspice displays this (currently only in the footer)",
          type: "string",
          pattern: "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$",
        },
        build_url: {
          description:
            "Auspice displays this at the top of the page as part of a byline",
          type: "string",
        },
        description: {
          description: "Auspice displays this currently in the footer.",
          type: "string",
        },
        maintainers: {
          description: "Who maintains this dataset?",
          type: "array",
          uniqueItems: true,
          minItems: 1,
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
              },
              url: {
                type: "string",
              },
            },
            required: ["name"],
          },
        },
        genome_annotations: {
          description:
            "Genome annotations (e.g. genes), relative to the reference genome",
          type: "object",
          required: ["nuc"],
          additionalProperties: false,
          properties: {
            nuc: {
              type: "object",
              properties: {
                seqid: {
                  description:
                    "Sequence on which the coordinates below are valid. Could be viral segment, bacterial contig, etc",
                  type: "string",
                },
                type: {
                  description:
                    "Type of the feature. could be mRNA, CDS, or similar",
                  type: "string",
                },
                start: {
                  description:
                    "Gene start position (one-based, following GFF format)",
                  type: "number",
                },
                end: {
                  description:
                    "Gene end position (one-based closed, last position of feature, following GFF format)",
                  type: "number",
                },
                strand: {
                  description: "Positive or negative strand",
                  type: "string",
                  enum: ["-", "+"],
                },
              },
            },
          },
          patternProperties: {
            "^[a-zA-Z0-9*_-]+$": {
              $ref:
                "#/properties/meta/properties/genome_annotations/properties/nuc",
            },
          },
        },
        filters: {
          description:
            "These appear as filters in the footer of Auspice (which populates the displayed values based upon the tree)",
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
          },
        },
        panels: {
          description: "Which panels should Auspice display?",
          type: "array",
          items: {
            type: "string",
            enum: ["tree", "map", "frequencies", "entropy"],
          },
          uniqueItems: true,
          minItems: 1,
        },
        geo_resolutions: {
          description:
            "The available options for the geographic resolution dropdown, and their lat/long information",
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            description: "Each object here is an indiviual geo resolution",
            additionalProperties: false,
            required: ["key", "demes"],
            properties: {
              key: {
                type: "string",
                description:
                  "Trait key - must be specified on nodes (e.g. 'country')",
              },
              title: {
                type: "string",
                description:
                  "The title to display in the geo resolution dropdown. Optional -- if not provided then `key` will be used.",
              },
              demes: {
                type: "object",
                description:
                  "The deme names & lat/long info for this geographic resolution",
                patternProperties: {
                  "^[a-z_]+$": {
                    description: "Lat/long info for this deme",
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      latitude: {
                        type: "number",
                        minimum: -90,
                        maximum: 90,
                      },
                      longitude: {
                        type: "number",
                        minimum: -180,
                        maximum: 180,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        colorings: {
          description: "Available colorBys for Auspice",
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            description:
              "Each object here is an indiviual coloring, which will populate the sidebar dropdown in auspice",
            required: ["key", "type"],
            properties: {
              key: {
                description:
                  "They key used to access the value of this coloring on each node",
                type: "string",
              },
              title: {
                description:
                  'Text to be displayed in the "color by" dropdown and the tree legend',
                type: "string",
              },
              type: {
                description:
                  "Dictates how the color scale should be constructed",
                type: "string",
                enum: ["continuous", "ordinal", "categorical", "boolean"],
              },
              scale: {
                description:
                  "Provided mapping between trait values & hex values",
                type: "array",
                items: {
                  type: "array",
                  items: [
                    {
                      type: "string",
                      description:
                        "value of trait (should exist on >= 1 nodes)",
                    },
                    {
                      type: "string",
                      description: "color hex value",
                      pattern: "^#[0-9A-Fa-f]{6}$",
                    },
                  ],
                },
              },
            },
          },
        },
        display_defaults: {
          description:
            "Set the defaults for certain display options in Auspice. All are optional.",
          type: "object",
          additionalProperties: false,
          properties: {
            geo_resolution: {
              description: "Default geographic resolution",
              type: "string",
            },
            color_by: {
              description: "Default color by",
              type: "string",
            },
            distance_measure: {
              description: "Default tree metric",
              type: "string",
              enum: ["div", "num_date"],
            },
            layout: {
              description: "Default tree layout",
              type: "string",
              enum: ["rect", "radial", "unrooted", "clock"],
            },
            map_triplicate: {
              description:
                "Should the map be extended / wrapped around. Useful if transmissions are worldwide.",
              type: "boolean",
            },
            branch_label: {
              description: "What branch label should be displayed by default.",
              type: "string",
            },
            transmission_lines: {
              description:
                "Should transmission lines (if available) be displaye by default",
              type: "boolean",
            },
          },
        },
        tree_name: {
          description:
            "The name of the tree (e.g. segment name), if applicable",
          type: "string",
        },
        frequencies: {},
      },
    },
    tree: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: {
          description: "Strain name. Must be unique. No spaces",
          type: "string",
        },
        node_attrs: {
          description:
            "attributes associated with the node (sequence, date, location) as opposed to changes from one node to another.",
          type: "object",
          properties: {
            div: {
              description: "Node (phylogenetic) divergence",
              type: "number",
            },
            num_date: {
              type: "object",
              required: ["value"],
              properties: {
                value: {
                  type: "number",
                },
                confidence: {
                  description: "Confidence of the node date",
                  type: "array",
                  items: [
                    {
                      type: "number",
                    },
                    {
                      type: "number",
                    },
                  ],
                },
              },
            },
            vaccine: {
              description: "Vaccine information",
              properties: {
                serum: {
                  description: "strain used to raise sera (for ???)",
                  type: "boolean",
                },
                selection_date: {
                  description: "Vaccine selection date",
                  type: "string",
                  pattern: "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$",
                },
                start_date: {
                  description: "Vaccine usage start date",
                  type: "string",
                  pattern: "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$",
                },
                end_date: {
                  description: "When the vaccine was stopped",
                  type: "string",
                  pattern: "^[0-9X]{4}-[0-9X]{2}-[0-9X]{2}$",
                },
              },
            },
            hidden: {
              type: "string",
              enum: ["always", "timetree", "divtree"],
            },
            url: {
              description:
                "URL of the sequence (usually https://www.ncbi.nlm.nih.gov/nuccore/...)",
              type: "string",
              pattern: "^https?://.+$",
            },
            author: {
              description: "Author information (terminal nodes only)",
              type: "object",
              required: ["value"],
              properties: {
                value: {
                  description:
                    "unique value for this publication. Displayed as-is by auspice.",
                  type: "string",
                },
                title: {
                  description: "Publication title",
                  type: "string",
                },
                journal: {
                  description: "Journal title (including year, if applicable)",
                  type: "string",
                },
                paper_url: {
                  description: "URL link to paper (if available)",
                  type: "string",
                  pattern: "^https?://.+$",
                },
              },
            },
            accession: {
              description: "Sequence accession number",
              type: "string",
              pattern: "^[0-9A-Za-z-_]+$",
            },
          },
          patternProperties: {
            "(?!div|num_date|vaccine|hidden|url|author|accession)(^.+$)": {
              description:
                "coloring / geo resolution information attached to this node",
              type: "object",
              required: ["value"],
              properties: {
                value: {
                  type: ["string", "number", "boolean"],
                },
                confidence: {
                  description: "Confidence of the trait date",
                  oneOf: [
                    {
                      type: "array",
                      items: [
                        {
                          type: "number",
                        },
                        {
                          type: "number",
                        },
                      ],
                    },
                    {
                      type: "object",
                      patternProperties: {
                        "^.+$": {
                          type: "number",
                          minimum: 0,
                          maximum: 1,
                        },
                      },
                    },
                  ],
                },
                entropy: {
                  type: "number",
                },
              },
            },
          },
        },
        branch_attrs: {
          description:
            "attributes associated with the branch from the parent node to this node, such as branch lengths, mutations, support values",
          type: "object",
          properties: {
            labels: {
              description: "Node labels",
              patternProperties: {
                "^[a-zA-Z0-9]+$": {
                  type: "string",
                },
              },
            },
            mutations: {
              description:
                "Mutations occuring between the parent and this node",
              type: "object",
              additionalProperties: false,
              properties: {
                nuc: {
                  description: "nucelotide mutations",
                  type: "array",
                  items: {
                    oneOf: [
                      {
                        type: "string",
                        pattern: "^[ATCGNYRWSKMDVHB-][0-9]+[ATCGNYRWSKMDVHB-]$",
                      },
                    ],
                  },
                },
              },
              patternProperties: {
                "^[a-zA-Z0-9_-]+$": {
                  description:
                    "Amino acid mutations for this gene (or annotated region)",
                  type: "array",
                  items: {
                    pattern: "^[A-Z*-][0-9]+[A-Z*-]$",
                  },
                },
              },
            },
          },
        },
        children: {
          description:
            "Child nodes. Recursive structure. Terminal nodes do not have this property.",
          type: "array",
          minItems: 1,
          items: {
            $ref: "#/properties/tree",
          },
        },
      },
    },
  },
};
validate.errors = null;
module.exports = validate;
