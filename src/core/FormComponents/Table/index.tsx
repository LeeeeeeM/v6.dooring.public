import React, { useContext, useState, useEffect, useRef, memo, RefObject } from 'react'
import { Table, Input, Button, Popconfirm, Form, Upload, Modal } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import XLSX from 'xlsx'

import FormattedMsg from '@/components/FormattedMsg'
import { uuid } from '@/utils/tool'

// 下方样式主要为全局样式，暂时不可删
import styles from './index.less'
import { FormattedMessage } from 'react-intl'

const EditableContext = React.createContext<any>(null)

interface Item {
  key: string;
  name: string;
  age: string;
  address: string;
}

interface EditableRowProps {
  index: number;
}

const EditableRow: React.FC<EditableRowProps> = ({ index, ...props }) => {
  const [form] = Form.useForm()
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  )
}

interface EditableCellProps {
  title: React.ReactNode;
  editable: boolean;
  children: React.ReactNode;
  dataIndex: string;
  record: any;
  handleSave: (record: Item) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  ...restProps
}) => {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const form = useContext(EditableContext)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
    }
  }, [editing])

  const toggleEdit = () => {
    setEditing(!editing)
    form.setFieldsValue({ [dataIndex]: record[dataIndex] })
  }

  const save = async() => {
    try {
      const values = await form.validateFields()
      toggleEdit()
      handleSave({ ...record, ...values })
    } catch (errInfo) {
      // eslint-disable-next-line no-console
      console.log('Save failed:', errInfo)
    }
  }

  let childNode = children

  if (editable) {
    childNode = editing
      ? (
        <Form.Item
          style={{ margin: 0 }}
          name={dataIndex}
          rules={[
            {
              required: true,
              message: `${title} 是必填的.`,
            },
          ]}
        >
          <Input
            ref={(inputRef as unknown) as () => RefObject<HTMLInputElement>}
            onPressEnter={save}
            onBlur={save}
          />
        </Form.Item>
      )
      : (
        <div className="editable-cell-value-wrap" style={{ paddingRight: 24 }} onClick={toggleEdit}>
          {children}
        </div>
      )
  }

  return <td {...restProps}>{childNode}</td>
}

class EditableTable extends React.Component<any, any> {
  columns: (
    | { title: string; dataIndex: string; width: string; editable: boolean; render?: undefined }
    | {
        title: string;
        dataIndex: string;
        // eslint-disable-next-line no-undef
        render: (text: string, record: any) => JSX.Element | null;
        width?: undefined;
        editable?: undefined;
      }
  )[];

  apiForm: {
    api: string;
    header: string;
    dataField: string;
  };

  constructor(props: any) {
    super(props)
    this.columns = [
      {
        title: '名字',
        dataIndex: 'name',
        width: '180px',
        editable: true,
      },
      {
        title: '值',
        dataIndex: 'value',
        width: '120px',
        editable: true,
      },
      {
        title: '操作',
        dataIndex: 'operation',
        render: (text: string, record) =>
          this.state.dataSource.length >= 1
            ? (
              <Popconfirm title="Sure to delete?" onConfirm={() => this.handleDelete(record.key)}>
                <Button type="link" size="small">
                  <FormattedMsg id="Delete" />
                </Button>
              </Popconfirm>
            )
            : null,
      },
    ]

    this.apiForm = {
      api: '',
      header: '',
      dataField: '',
    }

    const dataSource =
      props.data instanceof Array && props.data.map((item: any, i: number) => ({ key: i + '', ...item }))

    this.state = {
      dataSource,
      visible: false,
      apiVisible: false,
      apiResult: '',
    }
  }

  handleDelete = (key: string) => {
    const dataSource = [...this.state.dataSource]
    const newDataSource = dataSource.filter(item => item.key !== key)
    this.setState({ dataSource: newDataSource })
    this.props.onChange && this.props.onChange(newDataSource)
  };

  handleAdd = () => {
    const { dataSource } = this.state
    const uid = uuid(8, 10)
    const newData = {
      key: uid,
      name: `dooring ${dataSource.length + 1}`,
      value: 32,
    }
    const newDataSource = [...dataSource, newData]
    this.setState({
      dataSource: newDataSource,
    })
    this.props.onChange && this.props.onChange(newDataSource)
  };

  handleSave = (row: any) => {
    const newData = [...this.state.dataSource]
    const index = newData.findIndex(item => row.key === item.key)
    const item = newData[index]
    newData.splice(index, 1, {
      ...item,
      ...row,
    })
    this.setState({ dataSource: newData })
    this.props.onChange && this.props.onChange(newData)
  };

  showModal = () => {
    this.setState({
      visible: true,
    })
  };

  handleOk = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    this.setState({
      visible: false,
    })
  };

  handleCancel = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    this.setState({
      visible: false,
    })
  };

  showApiModal = () => {
    this.setState({
      apiVisible: true,
    })
  };

  handleAPIOk = () => {
    const { dataField } = this.apiForm
    if (dataField) {
      let data = this.state.apiResult[dataField]
      if (data && data instanceof Array) {
        data = data.map((item, i) => ({ key: i + '', ...item }))
        this.setState({
          dataSource: data,
        })
        this.props.onChange && this.props.onChange(data)
      }
      this.setState({
        apiVisible: false,
      })
    }
  };

  handleAPICancel = () => {
    this.setState({
      apiVisible: false,
    })
  };

  handleApiField = (type: 'api' | 'header' | 'dataField', v: string) => {
    this.apiForm[type] = v
  };

  getApiFn = () => {
    // console.log(this.apiForm)
    const { api, header } = this.apiForm
    fetch(api, {
      cache: 'no-cache',
      headers: Object.assign(
        { 'content-type': 'application/json' },
        header ? JSON.parse(header) : {},
      ),
      method: 'GET',
      mode: 'cors',
    })
      .then(res => res.json())
      .then(res => {
        this.setState({
          apiResult: res,
        })
      })
  };

  render() {
    const { dataSource } = this.state
    const components = {
      body: {
        row: EditableRow,
        cell: EditableCell,
      },
    }
    const columns: ColumnsType<any> = this.columns.map(col => {
      if (!col.editable) {
        return col
      }
      return {
        ...col,
        onCell: record => ({
          record,
          editable: col.editable,
          dataIndex: col.dataIndex,
          title: col.title,
          handleSave: this.handleSave,
        }),
      }
    })
    const _this = this
    const props = {
      name: 'file',
      // action: '',
      showUploadList: false,
      beforeUpload(file: File, fileList: Array<File>) {
        // 解析并提取excel数据
        const reader = new FileReader()
        reader.onload = function(e: any) {
          const data = e.target.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetNames = workbook.SheetNames // 工作表名称集合
          const draftArr: any = {}
          sheetNames.forEach(name => {
            const worksheet = workbook.Sheets[name] // 只能通过工作表名称来获取指定工作表
            for (const key in worksheet) {
              // v是读取单元格的原始值
              if (key[0] !== '!') {
                if (draftArr[key[0]]) {
                  draftArr[key[0]].push(worksheet[key].v)
                } else {
                  draftArr[key[0]] = [worksheet[key].v]
                }
              }
            }
          })
          const sourceData = Object.values(draftArr).map((item: any, i) => ({
            key: i + '',
            name: item[0],
            value: item[1],
          }))
          _this.setState({
            dataSource: sourceData,
          })
          _this.props.onChange && _this.props.onChange(sourceData)
        }
        reader.readAsBinaryString(file)
      },
    }
    return (
      <div>
        <Button ghost type="primary" size="small" onClick={this.showModal}>
          <FormattedMsg id='Editor data source' />
        </Button>
        <Modal
          title={<FormattedMsg id="Editor data source" />}
          visible={this.state.visible}
          onOk={this.handleOk}
          onCancel={this.handleCancel}
          cancelButtonProps={{ ghost: true }}
          okButtonProps={{ ghost: true }}
        >
          <Button
            size="small"
            onClick={this.handleAdd}
            type="primary"
            style={{ marginBottom: 16, marginRight: 16 }}
          >
            <FormattedMsg id="Add line" />
          </Button>
          <Upload {...props}>
            <Button size="small" type="primary" ghost style={{ marginRight: 16 }}>
              <FormattedMsg id="Import excel" />
            </Button>
          </Upload>
          <Button size="small" type="primary" ghost onClick={this.showApiModal}>
            <FormattedMsg id="Other apis" />
          </Button>
          <Table
            size="small"
            components={components}
            rowClassName={() => 'editable-row'}
            bordered={false}
            dataSource={dataSource}
            columns={columns}
            pagination={{ pageSize: 5, size: 'small' }}
            scroll={{ y: 240 }}
          />
        </Modal>
        <Modal
          title={<FormattedMsg id="Configure api" />}
          visible={this.state.apiVisible}
          onOk={this.handleAPIOk}
          onCancel={this.handleAPICancel}
          cancelButtonProps={{ ghost: true }}
          okButtonProps={{ ghost: true }}
        >
          <div className={styles.apiForm}>
            <div className={styles.formItem}>
              <Input
                placeholder="请输入api地址"
                onChange={e => this.handleApiField('api', e.target.value)}
              />
            </div>
            <div className={styles.formItem}>
              <Input.TextArea
                placeholder="请输入头信息, 如{token: 123456}, 格式必须为json对象"
                rows={4}
                onChange={e => this.handleApiField('header', e.target.value)}
              />
            </div>
            <div className={styles.formItem}>
              <Button size="small" type="primary" onClick={this.getApiFn}>
                <FormattedMessage id="Send the request" />
              </Button>
            </div>
            {this.state.apiResult && (
              <>
                <div className={styles.formItem}>
                  <Input.TextArea rows={6} value={JSON.stringify(this.state.apiResult, null, 4)} />
                </div>
                <div className={styles.formItem}>
                  <Input
                    placeholder="设置数据源字段"
                    onChange={e => this.handleApiField('dataField', e.target.value)}
                  />
                  <p style={{ color: 'red' }}>
                    <FormattedMessage id="DATA_SOURCE_DESC" />
                  </p>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>
    )
  }
}

// EditableTable.contextType = IntlContext

export default memo(EditableTable)
