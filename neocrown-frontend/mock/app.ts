const genResponse = (data: unknown) => {
  return {
    code: '000',
    msg: 'success',
    data,
  }
}

export default [
  {
    url: '/dev/foo',
    method: 'get',
    response: () => {
      return genResponse({
        username: 'foo',
      })
    },
  },
  {
    url: '/dev/job/detail',
    method: 'get',
    response: () => {
      return {
        code: '112',
        msg: '数据不存在',
        data: null,
        success: false,
        traceId: 'traceId_4299f155d0ab',
      }
    },
  },
]
