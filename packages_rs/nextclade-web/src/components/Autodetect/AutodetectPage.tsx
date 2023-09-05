import React from 'react'
import { Col as ColBase, Row as RowBase } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { TableSlimWithBorders } from 'src/components/Common/TableSlim'
import { Layout } from 'src/components/Layout/Layout'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { autodetectResultsAtom } from 'src/state/autodetect.state'
import styled from 'styled-components'

const Container = styled.div`
  margin-top: 1rem;
  height: 100%;
  overflow: hidden;
`

const Row = styled(RowBase)`
  overflow: hidden;
  height: 100%;
`

const Col = styled(ColBase)`
  overflow: hidden;
  height: 100%;
`

const Table = styled(TableSlimWithBorders)`
  padding-top: 50px;

  & thead {
    height: 51px;
    position: sticky;
    top: -2px;
    background-color: ${(props) => props.theme.gray700};
    color: ${(props) => props.theme.gray100};
  }

  & thead th {
    margin: auto;
    text-align: center;
    vertical-align: middle;
  }
`

const TableWrapper = styled.div`
  height: 100%;
  overflow-y: auto;
`

export function AutodetectPage() {
  const { t } = useTranslationSafe()
  // const minimizerIndex = useRecoilValue(minimizerIndexAtom)
  const autodetectResults = useRecoilValue(autodetectResultsAtom)

  return (
    <Layout>
      <Container>
        <Row noGutters>
          <Col>
            <TableWrapper>
              <Table striped>
                <thead>
                  <tr>
                    <th>{'#'}</th>
                    <th>{t('Seq. name')}</th>
                    <th>{t('dataset')}</th>
                    <th>{t('total hits')}</th>
                    <th>{t('max hit')}</th>
                  </tr>
                </thead>

                <tbody>
                  {autodetectResults.map((res) => (
                    <tr key={res.fastaRecord.index}>
                      <td>{res.fastaRecord.index}</td>
                      <td>{res.fastaRecord.seqName}</td>
                      <td>{res.result.dataset ?? ''}</td>
                      <td>{res.result.totalHits}</td>
                      <td>{res.result.maxNormalizedHit.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </Col>
        </Row>
      </Container>
    </Layout>
  )
}
